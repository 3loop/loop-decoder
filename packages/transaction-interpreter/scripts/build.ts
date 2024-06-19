import chokidar from 'chokidar'
import { Command } from 'commander'
import glob from 'fast-glob'
import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import generate from '@babel/generator'
import * as esbuild from 'esbuild'

function log(message: string) {
  console.log(chalk.blue(message))
}

// Folder names
const SOURCE_FOLDER_NAME = 'interpreters'
const OUTPUT_FILE_NAME = 'src/interpreters.ts'

function getInterpreterName(p: path.ParsedPath) {
  return `${p.dir}/${p.name}`.replace(/^interpreters\//, '')
}

interface Interpreter {
  name: string
  output: string
  contracts: string[]
}

async function generateMappings(interpreters: Interpreter[]) {
  const filepath = `${SOURCE_FOLDER_NAME}/index.ts`
  const template = await fs.readFile(filepath, 'utf-8')

  const contractToName = interpreters.reduce(
    (acc, { name, contracts }) => {
      contracts.forEach((contract) => {
        acc[contract] = name
      })
      return acc
    },
    {} as Record<string, string>,
  )

  const nameToCode = interpreters.reduce(
    (acc, { name, output }) => {
      acc[name] = output.replaceAll('export ', '')
      return acc
    },
    {} as Record<string, string>,
  )

  const contractMap = JSON.stringify(contractToName).slice(1, -1)
  const interpreterMap = JSON.stringify(nameToCode).slice(1, -1)

  const content = template
    .replace('/**PLACE_CONTRACT_MAPPING**/', contractMap)
    .replace('/**PLACE_INTEPRETATIONS**/', interpreterMap)

  await fs.writeFile(OUTPUT_FILE_NAME, content)
}

async function processInterpreter(file: string, isDev?: boolean) {
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

  const name = getInterpreterName(path.parse(file))

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
  const fileName = files.length === 1 ? files[0] : `${files.length} interpreters`

  const transfoms = files.map((file) => processInterpreter(file, isDev))

  const interpreters = await Promise.all(transfoms)

  await generateMappings(interpreters)

  log(`Built ${fileName}`)
}

export async function runCompiler({ watch }: { watch: boolean }) {
  const SOURCE_FILE_GLOB = `${SOURCE_FOLDER_NAME}/**/*.ts`
  const files = (await glob(SOURCE_FILE_GLOB)).filter((file) => !file.includes('index.ts'))

  await processFiles(files, undefined)

  if (watch) {
    const watcher = chokidar.watch(SOURCE_FILE_GLOB, { ignoreInitial: true })

    // Process the changed file
    watcher.on('change', (file) => processFiles([file], true))
    watcher.on('add', (file) => processFiles([file], true))
  }
}

const program = new Command('build')
  .description('build all the interpreters in the current directory')
  .option('-w, --watch', 'Watch files and re-compile on change')
  .action(runCompiler)

export default program
