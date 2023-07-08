module.exports = {
    env: { browser: true, es2020: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest', sourceType: 'module',
        tsconfigRootDir: __dirname
    },
    plugins: ['react'],
    rules: {
        'node/no-unpublished-import': 'off',
        'node/no-missing-import': 'off',
        'node/no-unsupported-features/es-syntax': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
    }
}
