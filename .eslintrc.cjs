module.exports = {
  root: true,
  ignorePatterns: [
    'node_modules',
    'dist',
    'objs'
  ],
  overrides: [
    {
      files: ['*.js', '*.cjs'],
      extends: ['@ni/eslint-config-javascript'],
      env: {
        es2022: true
      },
      rules: {
        indent: ['error', 2],
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        '@ni/eslint-config-typescript',
        '@ni/eslint-config-typescript/requiring-type-checking',
      ],
      rules: {
        '@typescript-eslint/indent': ['error', 2],
        '@typescript-eslint/naming-convention': 'off',
      },
      parserOptions: {
        project: ['./examples/*/tsconfig.json'],
        tsconfigRootDir: __dirname
      },
    },
    {
      files: ['*.js', '*.cjs', '*.ts', '*.tsx'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['rollup.*.js'],
      rules: {
        'import/no-default-export': 'off'
      }
    },
    {
      files: ['*-node.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      }
    }
  ]
};
