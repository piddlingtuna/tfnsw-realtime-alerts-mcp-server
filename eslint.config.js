import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    {
        ignores: ['node_modules/**', 'build/**', 'dist/**', '.git/**']
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            // No semicolons
            'semi': ['error', 'never'],

            // Function expressions with const func = () syntax
            'func-style': ['error', 'expression'],
            'prefer-arrow-callback': 'error',
            'arrow-body-style': ['error', 'as-needed'],

            // Other style preferences
            'no-var': 'error',
            'prefer-const': 'error',
            'indent': ['error', 2],
            'quotes': ['error', 'double'],

            // TypeScript specific rules
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        }
    }
]; 