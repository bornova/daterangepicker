import globals from 'globals'
import js from '@eslint/js'

export default [
  { ignores: ['dist', 'docs/daterangepicker.css', 'docs/daterangepicker.min.js'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
        DateRangePicker: 'readonly',
        luxon: 'readonly'
      },
      sourceType: 'module'
    }
  }
]
