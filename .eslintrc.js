module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'react/no-unescaped-entities': 'off',
    '@typescript-eslint/no-explicit-any': 'error'
  }
} 