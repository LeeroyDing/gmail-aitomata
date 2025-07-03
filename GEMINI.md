# Project: AI-Powered Gmail Automata

## Objective
Evolve the script from a static, rule-based system to an intelligent email assistant using an LLM to manage a to-do list in Google Tasks and organize the inbox.

## Current Status
The script intelligently analyzes incoming emails to determine if they are actionable. For actionable emails, it automatically creates a task in Google Tasks with an AI-generated title and summary. Non-actionable emails are left as unread, ensuring that only relevant items are added to your to-do list.

## Development

### Deployment
To deploy the script, run the following command:
```bash
yarn deploy -f
```

### Git Workflow
A typical git workflow for committing changes is:
```bash
# Check the status of the repository
git status

# Add modified files to the staging area
git add .

# Commit the changes with a descriptive message
git commit -m "Your commit message"

# Push the changes to the remote repository
git push
```
