# Project: AI-Powered Gmail Automata

## Objective
Evolve the script from a static, rule-based system to an intelligent email assistant using an LLM to manage a to-do list in Google Tasks and organize the inbox.

## Current Status
The architecture has been refactored from a rule-based system to an AI-driven model.

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
- **Local Testing Framework:** A local testing environment using Jest has been established.

## Action Items

### 1. Finalize Spreadsheet & API Configuration
- Create a new sheet named `AI_Context` with `Category` and `Guideline` columns.
- In the `configs` sheet, ensure `default_task_list_name` and `GEMINI_API_KEY` are filled out.
- In the Google Cloud Platform project, ensure the **Google Tasks API** and the **Generative Language API** are enabled.

### 2. Resolve Unit Test Failures
- Run the local test suite using `npx jest`.
- Debug and fix the test files (`AIAnalyzer.test.ts`, `TasksManager.test.ts`) and the mock setup (`jest.setup.js`).

### 3. Refine AI Prompt and Error Handling
- Review and refine the master prompt in `AIAnalyzer.ts`.
- Enhance the error handling in `AIAnalyzer.ts` to gracefully handle malformed JSON or unexpected responses from the AI.

### 4. End-to-End Testing and Deployment
- Once unit tests are passing, perform manual end-to-end testing.
- Deploy the script using `yarn deploy -f`.
- Trigger the `processEmails` function from the spreadsheet menu.
- Verify that emails are correctly processed, tasks are created/updated in Google Tasks, and the inbox is organized as expected.
- Check the Apps Script Execution Logs for any runtime errors.

### 5. Update Documentation
- Update the `README.md` file to reflect the new AI-powered workflow.

## Lessons Learned from Test Failures

- **Strict Typing:** The TypeScript compiler enforces Google Apps Script types. Mocks must be complete and accurate.
- **Global Namespace:** Avoid polluting the global namespace in tests. Use Jest's mocking features instead.
- **Code Separation:** Keep test code separate from application code.
- **Mocks:** Centralize mocks in `Mocks.ts`.
- **Jest:** Use Jest for its powerful mocking, assertion, and test running features.

## Core Principles

- **No `global` in non-test files:** The `global` object is not available in the Google Apps Script runtime and should not be used in application code.
