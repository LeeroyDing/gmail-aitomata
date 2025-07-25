The project follows a flat structure with most of the source code in the root directory.

*   **Core Logic:**
    *   `index.ts`: Main entry point for the Google Apps Script.
    *   `Processor.ts`: Handles the main email processing logic.
    *   `AIAnalyzer.ts`: Interacts with the Gemini API to analyze emails.
    *   `TasksManager.ts`, `GoogleTasksManager.ts`, `TodoistManager.ts`, `TasksManagerFactory.ts`: Manage task creation for different services.
*   **Configuration:**
    *   `Config.ts`: Defines the configuration settings.
    *   `appsscript.json`: Google Apps Script manifest file.
*   **Testing:**
    *   `*.test.ts`: Jest test files for the corresponding `.ts` files.
    *   `jest.config.js`, `jest.setup.js`: Jest configuration.
*   **Tooling:**
    *   `package.json`: Project dependencies and scripts.
    *   `eslint.config.js`: ESLint configuration.
    *   `tsconfig.json`: TypeScript configuration.
    *   `.clasp.json`: Clasp configuration (user-provided).
*   **Documentation:**
    *   `README.md`: Project overview and setup instructions.
    *   `CONTRIBUTING.md`: Contribution guidelines.
    *   `LICENSE`: Apache 2.0 License.