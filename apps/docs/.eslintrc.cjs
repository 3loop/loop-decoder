module.exports = {
  root: true,
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  extends: [
    "plugin:mdx/recommended",
    "custom/library",
  ],
  overrides: [
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {},
    },
    {
      files: ['*.mdx', '*.md'],
      parser: 'eslint-mdx'
    }
  ],
  rules: {
    '@typescript-eslint/triple-slash-reference': 'off',
  }
}