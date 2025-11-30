import { defineConfig } from 'eslint/config';
import { javascriptConfig } from '@ni/eslint-config-javascript';
import { typescriptConfig } from '@ni/eslint-config-typescript';

export default defineConfig([{
    ignores: [
        '**/node_modules/',
        '**/dist/*',
        '**/.rollup.cache/',
    ],
}, {
    files: ['**/*.js'],
    extends: javascriptConfig,
}, {
    files: ['**/*.ts'],
    extends: typescriptConfig,
    languageOptions: {
        parserOptions: {
            projectService: true
        },
    },
}, {
    files: ['**/*.js', '**/*.ts'],
    rules: {
        'no-console': 'off',
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    }
}, {
    files: ['**/rollup.*.js'],
    rules: {
        'import/no-default-export': 'off'
    }
}
]);
