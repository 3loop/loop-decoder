#!/usr/bin/env bun
import { Command } from 'commander'
import build from './build.js'

const program = new Command()

program
  .name('@3loop/transaction-interpreter-dev-tools')
  .description('Dev tools for transaction interpreters management.')
  .version('1.0.0')
program.addCommand(build)

program.parse(process.argv)
