# Gmail Automata

**Your Inbox, Automated.**

Gmail Automata turns your chaotic inbox into a structured, prioritized task list in **Todoist** or **Google Tasks**. It uses AI to read your emails, understand what needs to be done, and creates tasks for you.

## How It Works

1.  **Emails arrive** in your inbox.
2.  **AI analyzes them** every 5 minutes.
3.  **Tasks appear** in your Task Manager (Todoist/Google Tasks) with a summary, priority, and due date.
4.  **You process the tasks** (complete, reschedule, rename).
5.  **AI learns from you** (Coming Soon: The system watches your edits to get smarter).

## The Workflow (How to use this)

**Stop checking your email constantly.** Instead, live in your Task Manager.

### 1. The "Triage" Phase
Open your Task Manager. You will see new tasks created from your emails.
*   **If the AI got it right:** Great! Just do the task and check it off.
*   **If the AI got the date wrong:** Change the due date. *The AI will learn from this.*
*   **If the AI got the title wrong:** Rename it. *The AI will learn from this.*
*   **If it's not a task:** Delete it.

### 2. The "Action" Phase
Work through your tasks as you normally would. The original email is always linked in the task notes if you need to reply.

### 4. The "Missed Task" Scenario
If the AI *fails* to create a task for an important email:
1.  Go to Gmail.
2.  Apply the label `aitomata/force`.
3.  The system will force-create a task and *learn from this mistake*.

## Setup Guide

### Prerequisites
*   A Google Cloud Project with **Google Tasks API** and **Generative Language API** enabled.
*   A copy of the [Configuration Spreadsheet](https://docs.google.com/spreadsheets/d/1zC1ETBSEC5O3ihQgGvbSF3nbYuRrH66AxNEGwKs84k8/edit?gid=1898431028#gid=1898431028).

### Configuration
1.  **Spreadsheet Setup**:
    *   **`configs` sheet**: Enter your API keys and choose your Task Service (Todoist or Google Tasks).
    *   **`AI_Context` sheet**: (Optional) Write down general rules like "I am a software engineer" or "Prioritize emails from my boss".
2.  **Gmail Setup**:
    *   Create a label called `unprocessed`.
    *   Create a filter to apply `unprocessed` to incoming emails (skip the inbox if you're brave!).

## Development

### Installation
```bash
git clone https://github.com/LeeroyDing/gmail-aitomata.git
cd gmail-aitomata
yarn install
```

### Deploy
```bash
yarn claspLogin
yarn deploy
```