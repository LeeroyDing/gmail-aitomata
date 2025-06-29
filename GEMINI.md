# Project: AI-Powered Gmail Automata

## Objective
Evolve the script from a static, rule-based system to an intelligent email assistant using an LLM to manage a to-do list in Google Tasks and organize the inbox.

## Current Status
The architecture has been refactored from a rule-based system to an AI-driven model, and all unit tests are now passing.

### Key Achievements
- **Rule Engine Removed:** The legacy `Rule.ts` and `Condition.ts` have been removed.
- **New AI-Centric Architecture:**
    - `Processor.ts`: Central orchestrator.
    - `AIAnalyzer.ts`: Handles all communication with the AI model.
    - `TasksManager.ts`: Encapsulates all logic for interacting with the Google Tasks API.
- **Configuration from Spreadsheet:** The system is configured via the `configs` sheet.
- **Stateful Task Management:**
    - One active task per email thread.
    - The `completed` timestamp of a task is used as a checkpoint.
    - Only new messages are sent to the AI for summarization.
- **Human-Friendly Task Notes:** Tasks in Google Tasks are populated with a detailed summary, a link to the Gmail thread, and a machine-readable ID.
- **Local Testing Framework:** A local testing environment using Jest has been established, and all unit tests are now passing.

## Next Steps

### 1. User Configuration
- In your Google Spreadsheet, create a new sheet named exactly **`AI_Context`**.
- In the `AI_Context` sheet, create two columns with the headers `Category` and `Guideline`. Populate this with your personal context to guide the AI.
- In the `configs` sheet, ensure the following rows exist and are filled out correctly:
    - `default_task_list_name`: The exact name of your target Google Task list (e.g., "My Tasks").
    - `GEMINI_API_KEY`: Your valid API key for the Gemini model.
- In the Google Cloud Platform project associated with this script, ensure the **Google Tasks API** and the **Generative Language API (for Gemini)** are enabled.

### 2. Code Refinement
- **Refine AI Prompt:** Review and refine the master prompt in `AIAnalyzer.ts`. The current prompt is a good starting point, but it should be tested with a variety of real-world emails to ensure the AI's JSON output is consistently reliable.
- **Enhance Error Handling:** Enhance the error handling in `AIAnalyzer.ts`. If the AI returns malformed JSON or an unexpected response, the script should handle it gracefully (e.g., log the error and move the email to the "error" label) rather than crashing.

### 3. Testing and Deployment
- **Unit Tests:** Run the full test suite with `npx jest`. To tackle test files one by one, use `npx jest <file-name>.test.ts`.
- **End-to-End Testing:** Perform manual end-to-end testing by deploying the script (`yarn deploy -f`) and triggering the `processEmails` function from the spreadsheet menu.
- **Verification:** Verify that emails are correctly processed, tasks are created/updated in Google Tasks, and the inbox is organized as expected. Check the Apps Script Execution Logs for any runtime errors.

### 4. Documentation
- **Update README:** Update the `README.md` file to reflect the new AI-powered workflow. Remove all instructions related to the old `rules` sheet and add a new section explaining how to set up and use the `AI_Context` sheet.

## Lessons Learned

- **Strict Typing:** The TypeScript compiler enforces Google Apps Script types. Mocks must be complete and accurate.
- **Global Namespace:** Avoid polluting the global namespace in tests. Use Jest's mocking features instead.
- **Code Separation:** Keep test code separate from application code.
- **Mocks:** Centralize mocks in `Mocks.ts`.
- **Jest:** Use Jest for its powerful mocking, assertion, and test running features.
- **`ts-nocheck`:** Use the `// @ts-nocheck` directive to disable type checking for specific files that are causing issues with the TypeScript compiler.

## Core Principles

- **No `global` in non-test files:** The `global` object is not available in the Google Apps Script runtime and should not be used in application code.

## Git History

- **Removing Secrets:** To remove a secret from the git history, use `git rebase -i <commit-hash>^` to start an interactive rebase. Mark the commit with `edit`, then use `git rm --cached <file>` to remove the file from the commit. Finally, use `git commit --amend` and `git rebase --continue` to finish the rebase. Remember to force-push the changes to any remote repositories.