const tseslint = require('typescript-eslint');
const jest = require('eslint-plugin-jest');
const importPlugin = require('eslint-plugin-import');
const globals = require('globals');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...tseslint.configs.base.rules,
      ...tseslint.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
    },
  },
  {
    files: ['**/*.test.ts'],
    plugins: {
      jest: jest,
    },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },
);