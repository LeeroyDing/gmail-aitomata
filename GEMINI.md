# Project: AI-Powered Gmail Automata

## Objective
Evolve the script from a static, rule-based system to an intelligent email assistant using an LLM to manage a to-do list in Google Tasks and organize the inbox.

## Current Status
The script now intelligently analyzes incoming emails to determine if they are actionable. For actionable emails, it automatically creates a task in Google Tasks with an AI-generated title and summary. Non-actionable emails are left as unread in the inbox, ensuring that only relevant items are added to your to-do list.

## Next tasks

- Create Tasks Only for Actionable Emails.
- Remove "AI Summary" from Task Notes.
- Use `generationConfig` instead of prompt to specify output format for Gemini API output.
- Remove the ability to move emails back to inbox (remove `InboxAction`).
- Add Todoist support.
  - New settings should be added to the configs sheet to let you select your preferred task service (`task_service`) and provide your Todoist API key (`todoist_api_key`) and project ID (`todoist_project_id`).
