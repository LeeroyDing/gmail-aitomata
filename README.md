# Gmail Automata

[![Build Status](https://travis-ci.com/ranmocy/gmail-automata.svg?branch=master)](https://travis-ci.com/ranmocy/gmail-automata)

## Introduction

Gmail Automata is an AI-powered assistant that helps you manage your inbox by automatically creating tasks in your preferred task management service (Google Tasks or Todoist) for every email you receive. It uses a powerful language model to summarize emails and create meaningful tasks, saving you time and ensuring you never miss an important action item.

The script works by labeling all incoming emails as "unprocessed." It then runs automatically every 5 minutes, scanning for these emails, generating a task with an AI-powered summary, and then marking the email as "processed."

A key feature of this script is its ability to track conversations. If you receive new messages in a thread that already has a task, the script will update the existing task with a summary of the new messages. This ensures that your task always has the latest context from the email conversation.

If any error occurs during the process, the email is moved to your inbox and labeled as "error," so you can easily identify and address any issues.

## Setup

1.  **Clone the Spreadsheet:** Make a copy of this [spreadsheet](https://docs.google.com/spreadsheets/d/1zC1ETBSEC5O3ihQgGvbSF3nbYuRrH66AxNEGwKs84k8/edit?gid=1898431028#gid=1898431028). You'll need to grant permissions for the script to access your Gmail and Tasks.
2.  **Configure Your Assistant:**
    *   Create a new sheet named `AI_Context` and add two columns: `Category` and `Guideline`. Populate this sheet with your personal context to help the AI understand your priorities.
    *   In the `configs` sheet, configure the following settings:
        *   `task_service`: Set to either "Google Tasks" or "Todoist".
        *   `GEMINI_API_KEY`: Your API key for the Generative Language API (for Gemini).
        *   If using Google Tasks:
            *   `default_task_list_name`: The name of your target Google Task list (e.g., "My Tasks").
        *   If using Todoist:
            *   `todoist_api_key`: Your Todoist API key.
            *   `todoist_project_id`: The ID of your target Todoist project.
3.  **Enable APIs:** In the Google Cloud Platform project associated with your script, enable the **Google Tasks API** and the **Generative Language API (for Gemini)**.
4.  **Set Up Gmail:**
    *   Create a label named `unprocessed` in Gmail.
    *   Set up Gmail filters to automatically label new emails as `unprocessed` and archive them.
5.  **Start Processing:**
    *   To test the setup, manually add a few emails to the `unprocessed` label and run the script by clicking **Gmail Automata > Process now**.
    *   Once you're satisfied, start automatic processing by clicking **Gmail Automata > Start auto processing**.

## Customization

You can customize the script's behavior by editing the `configs` sheet. For detailed explanations of each setting, see the notes in the sheet's headers.

## Upgrading

You can upgrade to the latest version by either forking the spreadsheet again or by deploying the latest code from the repository.

## Dev Setup

1.  Install Node.js and Yarn.
2.  Clone the repository and install dependencies:
    ```bash
    git clone https://github.com/ranmocy/gmail-automata.git
    cd gmail-automata
    yarn install
    ```

## Deploy

1.  Set up your local development environment.
2.  Create a `.clasp.json` file and add your script ID.
3.  Log in to `clasp` and deploy the latest version:
    ```bash
    yarn claspLogin
    yarn deploy
    ```

## Changelog

*   **2024-07-01:** Added Todoist support, improved logging, and made the script more robust.
*   **2024-06-29:** Migrated to an AI-powered, task-oriented workflow.
*   **2020-01-10:** First Google internal beta version.
*   **2019-04-04:** First early adopter alpha version.