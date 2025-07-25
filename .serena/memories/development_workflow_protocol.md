# My Development Workflow Protocol

## 1. Project Setup
*   Activate the project using `activate_project`.
*   Immediately call the `onboarding` tool to understand the project's context and conventions.

## 2. Information Gathering & Planning
*   **Gather Information:** Use tools like `gh issue view`, `read_file`, and `search_for_pattern` to gather all necessary information for the task.
*   **Deep Analysis:** For complex tasks, use `thinkdeep` to conduct a thorough investigation and `tracer` to understand code execution flow. Use `analyze` for a high-level overview of the code.
*   **Explore Libraries:** If the task involves using new libraries, use `context7/resolve-library-id` and `context7/get-library-docs` to get up-to-date documentation.
*   **Synthesize:** After gathering information, use `think_about_collected_information` to synthesize findings.
*   **Plan:** For complex tasks, use `planner` to create a step-by-step plan. For simpler tasks, a clear plan in a GitHub issue comment is sufficient. Use `chat` for brainstorming and getting second opinions on the plan.

## 3. Implementation
*   **Branching:** After the plan is approved, create a new feature branch using `git checkout -b <branch-name>`.
*   **Adherence:** Before writing any code, use `think_about_task_adherence` to ensure the plan is correct and I'm on the right track.
*   **Coding:**
    *   When modifying code, especially tests, always read the existing file first to avoid overwriting or making incorrect assumptions.
    *   Use `refactor` to improve code structure and `docgen` to generate documentation as you code.
    *   Use `testgen` to create comprehensive tests for new functionality.
    *   If you encounter a bug, use `debug` to find the root cause.
*   **Challenging:** If you disagree with my approach, use the `challenge` tool to force a critical re-evaluation of the plan.

## 4. Verification & Completion
*   **Testing:** After making changes, run all relevant tests (`yarn test -o`) to verify the solution.
*   **Code Review:**
    *   Use `codereview` for a comprehensive review of the changes.
    *   Use `secaudit` to perform a security audit.
    *   Use `precommit` to run pre-commit checks.
*   **Consensus:** For major changes, use `consensus` to get a consensus from multiple models on the changes.
*   **Final Check:** Once I believe the task is complete, use `think_about_whether_you_are_done` to reflect and confirm all requirements have been met.

## 5. Committing & Creating a Pull Request
*   **Commit:** Stage all changes with `git add .` and commit with a descriptive message that links to the fixed issue.
*   **Push:** Push the feature branch to the remote repository (`git push origin <branch-name>`).
*   **Pull Request:** Create a pull request using `gh pr create`. The body of the pull request should contain a summary of the work that was done, explaining what changes were made and why.
*   **PR Checks:** After creating the pull request, wait for 60 seconds and then check the status of the PR checks using `gh pr checks`.

## 6. Review
*   Post the summaries of the `codereview`, `secaudit`, and `precommit` reviews to the pull request to facilitate the review process.
