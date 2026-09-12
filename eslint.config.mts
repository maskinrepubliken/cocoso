import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginUnusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';

/**
 * ESLint 9 flat config.
 *
 * The rule set is deliberately pragmatic: it catches real bugs (undefined
 * variables, unused imports, broken hook dependencies) without fighting a
 * codebase that is mid-migration to TypeScript. Tighten rules here as the
 * `any` count and the typecheck baseline shrink.
 */
export default defineConfig([
  globalIgnores([
    'node_modules/',
    '.meteor/',
    'packages/',
    'media/',
    'private/',
    'public/',
    'typecheck-baseline.json',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReactHooks.configs.flat.recommended,

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { 'unused-imports': pluginUnusedImports },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Unused imports are auto-fixable; unused variables are reported but
      // allowed when prefixed with an underscore.
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // The codebase still has ~250 `any`s; keep visibility without failing.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],

      // Meteor compiles JSX with the classic runtime (tsconfig jsx: "react"),
      // so `import React` is required in every JSX file. The recommended
      // preset's react-in-jsx-scope / jsx-uses-react rules enforce and
      // account for that; never enable the jsx-runtime preset here.
      // Props are typed through TypeScript, not PropTypes.
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // React Compiler-derived rules from eslint-plugin-react-hooks 7. Real
      // findings, but the codebase predates them; keep them visible.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',

      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
    },
  },

  // Meteor server code and Node scripts: Meteor build globals.
  {
    files: ['server/**', 'imports/api/**', 'imports/startup/server/**'],
    languageOptions: {
      globals: { ...globals.node, Npm: 'readonly', Assets: 'readonly' },
    },
  },
  {
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
]);
