import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import next from '@next/eslint-plugin-next';

export default [
  // базовые рекомендации
  js.configs.recommended,

  // игноры
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.turbo/**', '**/coverage/**'],
  },

  // TS/TSX (важно для <div />)
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ['**/*.{ts,tsx}'],
  })),

  // React + Hooks + Next rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@next/next': next,
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
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // React hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Next
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];
