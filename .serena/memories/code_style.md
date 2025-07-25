The project uses ESLint with a configuration that extends `tseslint.configs.recommended` and `jest.configs.recommended`. This implies a standard TypeScript and Jest code style. Key aspects include:

*   **Parsing:** Uses `@typescript-eslint/parser`.
*   **Globals:** Configured for both browser and Node.js environments.
*   **Plugins:** Utilizes `@typescript-eslint/eslint-plugin` and `eslint-plugin-jest`.
*   **Ignores:** The `node_modules` and `dist` directories are ignored.