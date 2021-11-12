module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'sanity/typescript'
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2019
  },
  rules: {
    'max-len': [1, {ignoreComments: true}],
    indent: [0],
    'implicit-arrow-linebreak': [1]
  }
}
