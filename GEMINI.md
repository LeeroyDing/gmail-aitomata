# Project: AI-Powered Gmail Automata

## Objective
Evolve the script from a static, rule-based system to an intelligent email assistant using an LLM to manage a to-do list in Google Tasks and organize the inbox.

## Current Status
The script now automatically creates a task in Google Tasks for every email, using an AI to generate a title and summary. The system is more robust, with improved error handling and a fallback mechanism for task titles.

### Key Achievements
- **Mandatory Task Creation:** Every email is now guaranteed to have a corresponding task in Google Tasks.
- **AI-Powered Summaries:** The AI is instructed to always provide a non-empty title and summary for each task.
- **Robust Fallback:** If the AI fails to generate a task title, the email's subject is used as a fallback.
- **Automated API Configuration:** The Google Tasks API is now automatically enabled during deployment, eliminating the need for manual setup.
- **Up-to-Date AI Model:** The script now uses a stable and recent version of the Gemini model.

## Next Steps

### 1. User Configuration
- In your Google Spreadsheet, create a new sheet named exactly **`AI_Context`**.
- In the `AI_Context` sheet, create two columns with the headers `Category` and `Guideline`. Populate this with your personal context to guide the AI.
- In the `configs` sheet, ensure the following rows exist and are filled out correctly:
    - `default_task_list_name`: The exact name of your target Google Task list (e.g., "My Tasks").
    - `GEMINI_API_KEY`: Your valid API key for the Gemini model.

### 2. Testing and Deployment
- **Unit Tests:** Run the full test suite with `npx jest`.
- **End-to-End Testing:** Perform manual end-to-end testing by deploying the script (`yarn deploy -f`) and triggering the `processEmails` function from the spreadsheet menu.
- **Verification:** Verify that emails are correctly processed, tasks are created in Google Tasks, and the inbox is organized as expected.

## Lessons Learned

- **Strict AI Instructions:** To ensure reliable output from the AI, provide clear and strict instructions in the prompt.
- **Fallback Mechanisms:** Implement fallback mechanisms to handle cases where the AI's output is not as expected.
- **Automated Configuration:** Use `appsscript.json` to automate the configuration of required services and APIs.
- **Versioned Models:** Use specific, versioned AI models to ensure stability and prevent unexpected behavior from model updates.

## Ideas for Future Improvement

- **Refactor to a Library:** To simplify updates across multiple copies of the spreadsheet, the core logic could be refactored into a standalone Google Apps Script library. This would allow for centralized code management and automatic updates for all users of the library.
