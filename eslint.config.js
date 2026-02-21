import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["node_modules/", "dist/", "public/vendor/", "data/"] },

  // Server TypeScript
  {
    ...js.configs.recommended,
    files: ["server/**/*.ts"],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["server/**/*.ts"],
  })),

  // Public JavaScript
  {
    ...js.configs.recommended,
    files: ["public/js/**/*.js"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
      },
    },
  },

  // Prettier (disable formatting rules)
  prettier,
];
