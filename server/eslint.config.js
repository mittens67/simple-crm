import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,js}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      // The GraphQL resolver boundary is currently untyped, which accounts for
      // almost every occurrence of `any` in this package. GraphQL codegen
      // removes them wholesale; until then this stays a warning so that CI can
      // enforce the rules that are already clean. Restore to 'error' once
      // codegen lands.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
