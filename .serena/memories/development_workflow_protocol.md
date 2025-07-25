# My Development Workflow Protocol

1.  **Project Setup:**
    *   Activate the project using `activate_project`.
    *   Immediately call the `onboarding` tool to understand the project's context and conventions.

2.  **Information Gathering & Planning:**
    *   Use tools like `gh issue view`, `read_file`, and `search_file_content` to gather all necessary information for the task.
    *   After gathering information, use the `think_about_collected_information` tool to synthesize my findings.
    *   Before starting implementation, post a clear plan as a comment on the relevant GitHub issue. This comment should outline the proposed changes.

3.  **Implementation:**
    *   After the plan is posted, create a new feature branch using `git checkout -b <branch-name>`.
    *   Before writing any code, use the `think_about_task_adherence` tool to ensure my plan is correct and I'm on the right track.
    *   When modifying code, especially tests, always read the existing file first to avoid overwriting or making incorrect assumptions.
    *   When using the `replace` tool, be very specific with the `old_string` argument, using context from the file to ensure accuracy.

4.  **Verification & Completion:**
    *   After making changes, run all relevant tests (`npm test`) to verify the solution.
    *   Once I believe the task is complete, use the `think_about_whether_you_are_done` tool to reflect and confirm all requirements have been met.

5.  **Committing & Creating a Pull Request:**
    *   Stage all changes with `git add .`.
    *   Commit the changes with a descriptive message that links to the fixed issue.
    *   Push the feature branch to the remote repository (`git push origin <branch-name>`).
    *   Create a pull request using `gh pr create`. The body of the pull request should contain a summary of the work that was done, explaining what changes were made and why.
    *   After creating the pull request, wait for 60 seconds.
    *   Check the status of the PR checks using `gh pr checks`.
