/** @type {import('eslint').Linter.Config} */
module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    extends: [
        "turbo",
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:sort-export-all/recommended",
        "plugin:prettier/recommended",
    ],
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
        "prettier",
        "sort-export-all",
    ],
    settings: {
        "import/resolver": { typescript: true, node: true },
        "import/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
    },
    rules: {
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-explicit-any": "off",
        '@typescript-eslint/strict-boolean-expressions': [
            'error',
            {
                allowString: false,
                allowNullableObject: false,
                allowNumber: false,
                allowNullableBoolean: true,
            },
        ],
        "@typescript-eslint/strict-boolean-expressions": "off",
        "object-shorthand": ["warn", "always"],
        "eqeqeq": [
            'error',
            'always',
            {
                null: 'never',
            },
        ],
    },
};
