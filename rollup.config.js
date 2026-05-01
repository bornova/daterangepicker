import terser from '@rollup/plugin-terser'
import { rmSync, mkdirSync, copyFileSync, readFileSync } from 'fs'

rmSync('dist', { recursive: true, force: true })
mkdirSync('dist', { recursive: true })

copyFileSync('src/css/daterangepicker.css', 'dist/daterangepicker.css')
copyFileSync('src/css/daterangepicker.css', 'docs/daterangepicker.css')

const { name, version } = JSON.parse(readFileSync('./package.json'))
const banner = `/*!
 * ${name} v${version}
 * Copyright (c) 2012-2020 Dan Grossman, 2026 Timur Atalay
 * Released under the MIT License - https://opensource.org/licenses/MIT
 */`

const input = 'src/js/DateRangePicker.js'
const external = ['luxon']

const browser = {
  input,
  external,
  output: { name: 'DateRangePicker', format: 'iife', globals: { luxon: 'luxon' }, banner }
}

const esm = {
  input,
  external,
  output: { format: 'esm', banner }
}

const stripComments = () =>
  terser({ compress: false, mangle: false, format: { beautify: true, indent_level: 2, comments: /^!/ } })

export default [
  {
    ...browser,
    output: { ...browser.output, file: 'dist/browser/daterangepicker.js' },
    plugins: [stripComments()]
  },
  {
    ...browser,
    output: { ...browser.output, file: 'dist/browser/daterangepicker.min.js', sourcemap: true },
    plugins: [terser({ format: { comments: /^!/ } })]
  },
  {
    ...esm,
    output: { ...esm.output, file: 'dist/esm/daterangepicker.js' },
    plugins: [stripComments()]
  }
]
