import path from 'path'
import { globSync } from 'glob'
import { defineConfig } from 'tsup'

const entries = globSync('src/**/*.ts')

export default defineConfig({
  bundle: false,
  treeshake: true,
  sourcemap: true,
  format: ['esm', 'cjs'],
  entry: entries,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    }
  },
  tsconfig: path.resolve(__dirname, './tsconfig.build.json'),
  outDir: 'dist',
  clean: true,
})
