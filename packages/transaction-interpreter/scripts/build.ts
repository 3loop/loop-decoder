import chokidar from 'chokidar'
import { Command } from 'commander'
import glob from 'fast-glob'
import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { parse } from '@babel/parser'
import _traverse, { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import _generator from '@babel/generator'
import * as esbuild from 'esbuild'
import template from '@babel/template'

// See https://github.com/babel/babel/issues/13855
const traverse = (_traverse as any).default
const generate = (_generator as any).default

function log(message: string) {
  console.log(chalk.blue(message))
}

// Folder names
const SOURCE_FOLDER_NAME = 'interpreters'
const OUTPUT_FILE_NAME = 'src/interpreters.ts'
const STD_FILE_NAME = 'std.ts'
const ENTRY_POINT_FILE_NAME = 'index.ts'
const FALLBACK_FILE_NAME = 'fallback.ts'

function getInterpreterName(p: path.ParsedPath) {
  return `${p.dir}/${p.name}`.replace(/^interpreters\//, '')
}

interface Interpreter {
  name: string
  output: string
  contracts: string[]
}

function testMatches(importName?: string, test?: RegExp | string) {
  const tests = Array.isArray(test) ? test : [test]

  return tests.some((regex) => {
    if (typeof regex === 'string') {
      regex = new RegExp(regex)
    }
    return regex.test(importName || '')
  })
}

async function compileStd(isDev: boolean) {
  const tsCode = await fs.readFile(`${SOURCE_FOLDER_NAME}/${STD_FILE_NAME}`, 'utf-8')
  const jsCode = await esbuild.transform(tsCode, {
    loader: 'ts',
    minify: !isDev,
  })

  // Remove export keyword as the file gets prepended to the interpeters
  return jsCode.code.replaceAll('export ', '')
}

async function generateMappings(interpreters: Interpreter[], isDev = false) {
  const filepath = `${SOURCE_FOLDER_NAME}/${ENTRY_POINT_FILE_NAME}`
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
      acc[name] = output
      return acc
    },
    {} as Record<string, string>,
  )

  const contractMap = JSON.stringify(contractToName).slice(1, -1)
  const interpreterMap = JSON.stringify(nameToCode).slice(1, -1)

  const [stdContent, fallbackContent] = await Promise.all([
    compileStd(isDev),
    processInterpreter(`${SOURCE_FOLDER_NAME}/${FALLBACK_FILE_NAME}`, isDev),
  ])

  // TODO: Use a template enigine like ejs
  const content = template
    .replace('/**PLACE_CONTRACT_MAPPING**/', contractMap)
    .replace('/**PLACE_INTEPRETATIONS**/', interpreterMap)
    .replace(`'/**PLACE_STD_CONTENT**/'`, `\`${stdContent}\``)
    .replace(`'/**PLACE_FALLBACK_CONTENT**/'`, JSON.stringify(fallbackContent.output))

  await fs.writeFile(OUTPUT_FILE_NAME, content)
}

async function processInterpreter(file: string, _isDev?: boolean) {
  let contracts: string[] = []

  const tsCode = await fs.readFile(file, 'utf-8')

  const jsCode = await esbuild.transform(tsCode, {
    loader: 'ts',
    minify: false, // !isDev, NOTE: not minifying for now to keep the std import names
  })

  const ast = parse(jsCode.code, {
    sourceType: 'module',
  })

  traverse(ast, {
    ExportNamedDeclaration(path: NodePath) {
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
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      const importName = path.node?.source && path.node?.source.value ? path.node?.source.value : undefined
      const isMatch = testMatches(importName, 'std.js')
      if (importName && isMatch) {
        path.remove()
      }
    },
  })

  const output = generate(ast, {}, { [file]: jsCode.code }).code.replaceAll('export ', '')

  const name = getInterpreterName(path.parse(file))

  return {
    contracts: contracts.map((c) => c.toLowerCase()),
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

  await generateMappings(interpreters, isDev)

  log(`Built ${fileName}`)
}

export async function runCompiler({ watch }: { watch: boolean }) {
  const SOURCE_FILE_GLOB = `${SOURCE_FOLDER_NAME}/**/*.ts`
  const files = (await glob(SOURCE_FILE_GLOB)).filter(
    (file) =>
      !file.includes(ENTRY_POINT_FILE_NAME) && !file.includes(STD_FILE_NAME) && !file.includes(FALLBACK_FILE_NAME),
  )

  await processFiles(files, watch)

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
