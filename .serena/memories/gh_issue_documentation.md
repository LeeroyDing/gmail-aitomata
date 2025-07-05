You can view an issue and its thread by using the `gh issue view` command followed by the issue number or URL.

To add a comment to an issue, you can use the `gh issue comment` command, again with the issue number or URL.

For multi-line comments, you have two main options:

1.  **Interactive Mode:** Simply run `gh issue comment <issue-number-or-url>`. This will open your default text editor, where you can type your multi-line comment. Once you save and close the editor, the comment will be posted.

2.  **Using Stdin:** You can pipe the comment to the command using the `--body-file -` flag. This is useful for scripting or for pasting a pre-written comment.

    Here's an example using a "here document":

    ```bash
    gh issue comment <issue-number-or-url> --body-file - <<EOF
    This is the first line of my comment.
    This is the second line.
    And a third.
    EOF
    ```