### **Project: AI-Powered Gmail Automata**

**Objective:** To evolve the Gmail Automata script from a static, rule-based system into an intelligent email assistant. The new system will use a Large Language Model (LLM) to understand email content, automatically manage a corresponding to-do list in Google Tasks, and keep the inbox organized.

---

### **Part 1: Current Status & Achievements**

We have successfully completed a major architectural refactoring of the original project. The core logic has been shifted from a rigid, user-defined ruleset to a dynamic, AI-driven model.

**Key Achievements:**

1.  **Rule Engine Removed:** The legacy system based on S-expressions (`Rule.ts`, `Condition.ts`) has been entirely removed, simplifying the core codebase significantly.
2.  **New AI-Centric Architecture:**
    *   `Processor.ts` has been rewritten to act as the central orchestrator.
    *   `AIAnalyzer.ts` has been created to handle all communication with the AI model (e.g., Gemini). It constructs prompts using a context sheet and parses the AI's response.
    *   `TasksManager.ts` has been created to encapsulate all logic for interacting with the Google Tasks API.
3.  **Configuration from Spreadsheet:** The system is configured via the `configs` sheet, which now includes fields for the `GEMINI_API_KEY` and the user-friendly `default_task_list_name`.
4.  **Stateful Task Management (The "What's New?" Feature):**
    *   The logic to maintain **one active task per email thread** is implemented.
    *   The system correctly uses the `completed` timestamp of a task as a **checkpoint**.
    *   When a thread with new messages is processed, the script identifies and sends **only the new messages** to the AI for summarization, creating a new "update" task.
5.  **Human-Friendly Task Notes:** Tasks created in Google Tasks are populated with a detailed summary, a direct link back to the Gmail thread, and a machine-readable ID for tracking.
6.  **Local Testing Framework:** A local testing environment using **Jest** has been established.
    *   A `jest.setup.js` file has been created to mock the global Google Apps Script objects (`GmailApp`, `Tasks`, etc.), allowing tests to run locally.
    *   Test files (`AIAnalyzer.test.ts`, `TasksManager.test.ts`) have been created to house unit tests for the new modules.

---

### **Part 2: Action Items to Complete the Project**

The foundational code is in place, but the following steps are required to make the system fully operational and robust.

**1. Finalize Spreadsheet & API Configuration:**
*   **Action:** In the Google Spreadsheet, create a new sheet named exactly **`AI_Context`**.
*   **Action:** In the `AI_Context` sheet, create two columns with the headers `Category` and `Guideline`. Populate this with your personal context to guide the AI.
*   **Action:** In the `configs` sheet, ensure the following rows exist and are filled out correctly:
    *   `default_task_list_name`: The exact name of your target Google Task list (e.g., "My Tasks").
    *   `GEMINI_API_KEY`: Your valid API key for the Gemini model.
*   **Action:** In the Google Cloud Platform project associated with this script, ensure the **Google Tasks API** and the **Generative Language API (for Gemini)** are enabled.

**2. Resolve Unit Test Failures:**
*   **Action:** Run the local test suite using the command `npx jest`.
*   **Problem:** The tests are currently failing. The primary issue is that the mock objects defined in `jest.setup.js` and used in the `.test.ts` files are not perfectly matching the complex types expected by the TypeScript compiler for the Google Apps Script environment.
*   **Action:** Debug and fix the test files (`AIAnalyzer.test.ts`, `TasksManager.test.ts`) and the mock setup (`jest.setup.js`).
    *   **Focus on:** Correctly typing the mock objects to satisfy the interfaces (e.g., ensuring `Tasks.Tasks.list` returns an object with an `items` property).
    *   **Goal:** Get the `npx jest` command to run successfully and have all tests pass.

**3. Refine AI Prompt and Error Handling:**
*   **Action:** Review and refine the master prompt in `AIAnalyzer.ts`. The current prompt is a good starting point, but it should be tested with a variety of real-world emails to ensure the AI's JSON output is consistently reliable.
*   **Action:** Enhance the error handling in `AIAnalyzer.ts`. If the AI returns malformed JSON or an unexpected response, the script should handle it gracefully (e.g., log the error and move the email to the "error" label) rather than crashing.

**4. End-to-End Testing and Deployment:**
*   **Action:** Once unit tests are passing, perform manual end-to-end testing.
    1.  Deploy the script using `yarn deploy -f`.
    2.  Trigger the `processEmails` function from the spreadsheet menu.
    3.  Verify that emails are correctly processed, tasks are created/updated in Google Tasks, and the inbox is organized as expected.
    4.  Check the Apps Script Execution Logs for any runtime errors.

**5. Update Documentation:**
*   **Action:** Update the `README.md` file to reflect the new AI-powered workflow. Remove all instructions related to the old `rules` sheet and add a new section explaining how to set up and use the `AI_Context` sheet.
