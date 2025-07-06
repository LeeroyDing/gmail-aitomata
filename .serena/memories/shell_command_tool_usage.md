To add a comment to a GitHub issue, use the `execute_shell_command` tool with the `gh issue comment` command. The `run_shell_command` tool may not have the necessary permissions.

Example:
```
execute_shell_command(command="gh issue comment 1 --repo LeeroyDing/gmail-aitomata --body-file - <<EOF
My multi-line comment.
EOF")
```