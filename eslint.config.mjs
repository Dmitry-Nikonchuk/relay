import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,

  // TypeScript (TS + TSX)
  ...tseslint.configs.recommended,

  // Отключает правила, конфликтующие с Prettier
  prettier,

  // Next + React rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': next,
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React 17+ (Next) — не требуем import React
      'react/react-in-jsx-scope': 'off',

      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Игноры
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'out/**', 'coverage/**'],
  },
];
