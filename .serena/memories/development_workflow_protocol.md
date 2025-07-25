# My Development Workflow Protocol

## 1. Project Setup
*   **Hint:** Call `initial_instructions` first to get project-specific guidance.
*   Activate the project using `activate_project`.
*   Immediately call the `onboarding` tool to understand the project's context and conventions.

## 2. Information Gathering & Planning
*   **Gather Information:** Use tools like `gh issue view`, `read_file`, and `search_for_pattern` to gather all necessary information for the task.
*   **Deep Analysis:** 
    *   **Hint:** Use `thinkdeep` for complex or ambiguous tasks where the path forward is not immediately clear.
    *   Use `tracer` to understand code execution flow and `analyze` for a high-level overview.
*   **Explore Libraries:** If the task involves using new libraries, use `context7/resolve-library-id` and `context7/get-library-docs` to get up-to-date documentation.
*   **Synthesize:** After gathering information, use `think_about_collected_information` to synthesize findings.
*   **Plan:** For complex tasks, use `planner` to create a step-by-step plan. For simpler tasks, a clear plan in a GitHub issue comment is sufficient. Use `chat` for brainstorming and getting second opinions on the plan.

## 3. Implementation
*   **Branching:** After the plan is approved, I will create a new feature branch using `git checkout -b <branch-name>`.
*   **Adherence:** 
    *   **Hint:** Use `think_about_task_adherence` as a final gut-check to confirm the plan is solid before writing code.
*   **AI-Driven TDD Cycle:**
    1.  **Write Integration Test:** I will write a high-level integration test that defines the feature or bug and fails as expected.
    2.  **USER CHECKPOINT #1 (Approve Test):** I will present the failing integration test to you. **Please review and approve it.** This confirms I'm solving the right problem.
    3.  **Inner TDD Loop:** I will then begin the unit test cycle:
        *   **Red:** Use `testgen` to create a failing unit test.
        *   **Green:** Write the minimal code to make the unit test pass.
        *   **Refactor:** Use `refactor` to improve the code.
        *   I will repeat this loop until the main integration test passes.
    4.  **USER CHECKPOINT #2 (Approve Solution):** Once the integration test passes, I will present the final code and tests to you. **Please review and approve the solution.**
*   **Challenging:** If you disagree with my approach at any point, use the `challenge` tool to force a critical re-evaluation.

## 4. Verification & Completion
*   **Testing:** After you approve the solution, I will run all relevant tests (`yarn test -o`) one last time to formally verify the solution.
*   **Code Review:**
    *   I will use `codereview` for a comprehensive review of the changes.
    *   I will use `secaudit` to perform a security audit.
    *   I will use `precommit` to run pre-commit checks.
*   **Consensus:** For major changes, I will use `consensus` to get a consensus from multiple models on the changes.
*   **Final Check:** I will use `think_about_whether_you_are_done` to reflect and confirm all requirements have been met.

## 5. Committing & Creating a Pull Request
*   **Commit:** I will stage all changes with `git add .` and commit with a descriptive message that links to the fixed issue.
*   **Push:** I will push the feature branch to the remote repository (`git push origin <branch-name>`).
*   **Pull Request:** I will create a pull request using `gh pr create`. The body of the pull request will contain a summary of the work that was done, explaining what changes were made and why.
*   **PR Checks:** After creating the pull request, I will wait for 60 seconds and then check the status of the PR checks using `gh pr checks`.

## 6. Review
*   I will post the summaries of the `codereview`, `secaudit`, and `precommit` reviews to the pull request to facilitate the review process.