import chokidar from 'chokidar'
import { Command } from 'commander'
import glob from 'fast-glob'
import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { parse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import generate from '@babel/generator'
import * as esbuild from 'esbuild'

function log(message: string) {
  console.log(chalk.blue(message))
}

// Folder names
const SOURCE_FOLDER_NAME = 'interpreters'
const DESTINATION_FOLDER_NAME = 'build'

function getInterpretationName(p: path.ParsedPath) {
  return `${p.dir}/${p.name}`.replace(/^interpreters\//, '')
}

interface Interpretation {
  name: string
  output: string
  contracts: string[]
}

/**
 * Generate index file with the mapping of the interpretations
 */
async function generateIndex(outdir: string, interpretations: Interpretation[]) {
  await fs.mkdir(outdir, { recursive: true })

  const contractToName = interpretations.reduce(
    (acc, { name, contracts }) => {
      contracts.forEach((contract) => {
        acc[contract] = name
      })
      return acc
    },
    {} as Record<string, string>,
  )

  const nameToCode = interpretations.reduce(
    (acc, { name, output }) => {
      acc[name] = output
      return acc
    },
    {} as Record<string, string>,
  )

  const indexContent = `var n=${JSON.stringify(contractToName)},m=${JSON.stringify(nameToCode)};
 function getInterpretorForContract({ address, chain }) {
    const contract = chain + ':' + address;
    const id = n[contract];
    if (!id) {
      return undefined;
    }

    return m[id];
  };
  export{ getInterpretorForContract };`

  Promise.all([
    // index.js
    await fs.writeFile(path.join(outdir, 'index.js'), indexContent),
    // index.d.ts
    fs.writeFile(
      path.join(outdir, 'index.d.ts'),
      `declare const interpretations: Record<string, string>
declare const contractToName: Record<string, string>
declare function getInterpretorForContract({ address, chain }: { address: string, chain: string }): string | undefined
export { getInterpretorForContract }
  `,
    ),
  ])
}

async function processInterpretation(file: string, isDev?: boolean) {
  let contracts: string[] = []

  const tsCode = await fs.readFile(file, 'utf-8')

  const jsCode = await esbuild.transform(tsCode, {
    loader: 'ts',
    minify: !isDev,
  })

  const ast = parse(jsCode.code, {
    sourceType: 'module',
  })

  traverse(ast, {
    ExportNamedDeclaration(path) {
      const node = path.node
      if (
        t.isExportNamedDeclaration(node) &&
        t.isVariableDeclaration(node.declaration) &&
        'name' in node.declaration.declarations[0].id &&
        node.declaration?.declarations?.[0]?.id.name === 'contracts' &&
        t.isArrayExpression(node.declaration.declarations[0].init)
      ) {
        contracts = node.declaration.declarations[0].init?.elements.map((e: any) => e.value)
        path.remove()
        path.stop()
      }
    },
  })

  const output = generate(ast).code

  const name = getInterpretationName(path.parse(file))

  return {
    contracts,
    output,
    name,
  }
}

/**
 * Transpiles all passed files and prints the progress
 * @param specs Array of filepaths
 */
async function processFiles(files: string[], isDev?: boolean) {
  const fileName = files.length === 1 ? files[0] : `${files.length} interpretations`

  const transfoms = files.map((file) => processInterpretation(file, isDev))

  const interpretations = await Promise.all(transfoms)

  await generateIndex(DESTINATION_FOLDER_NAME, interpretations)

  log(`Built ${fileName}`)
}

export async function runCompiler({ watch }: { watch: boolean }) {
  const SOURCE_FILE_GLOB = `${SOURCE_FOLDER_NAME}/**/*.ts`
  const files = await glob(SOURCE_FILE_GLOB)

  await processFiles(files, undefined)

  if (watch) {
    const watcher = chokidar.watch(SOURCE_FILE_GLOB, { ignoreInitial: true })

    // Process the changed file
    watcher.on('change', (file) => processFiles([file], true))
    watcher.on('add', (file) => processFiles([file], true))
  }
}

const program = new Command('build')
  .description('build all the interpretations in the current directory')
  .option('-w, --watch', 'Watch files and re-compile on change')
  .action(runCompiler)

export default program
