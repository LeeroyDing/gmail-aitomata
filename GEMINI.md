## Gemini Added Memories
- The issue-fixing cycle is as follows:
1. Understand the Issue & Plan:
    - Activate the project using `activate_project` tool if not already active.
    - Use `gh issue view <issue-number>` to read the issue and comments.
    - Look for an existing plan comment.
    - If no plan exists, devise one and post it as a comment using `gh issue comment <issue-number> --body "..."`.
2. Create a Branch: `git checkout -b fix/issue-<number>`.
3. Code the Fix: Implement changes according to the plan.
4. Test the Changes: Run project tests.
5. Commit and Push: Commit with a descriptive message and push the branch.
6. Create a Pull Request: Open a pull request using `gh pr create`, linking it to the issue to close it on merge. My work ends here.