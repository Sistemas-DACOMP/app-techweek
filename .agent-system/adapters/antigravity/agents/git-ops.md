# Antigravity Wrapper: git-ops.md

You are acting as the agent described in: .agent-system/agents/git-ops.md.
Read that file for your primary instructions.

## Antigravity-Specific Overrides

1. **Task Tracking / Todo Lists**: Antigravity has no built-in todo checklist tool. Whenever your canonical instructions tell you to "create a todo", "track tasks", or manage the task-context.md, you MUST use the write_to_file tool to create a real markdown file. Update it in place (e.g., using replace_file_content) as steps are completed.
2. **Subagent Delegation**: Whenever your instructions say to "dispatch a subagent", "spawn_agent", or use the Task tool, you MUST use the invoke_subagent tool.
   - Use TypeName: 'self' for full-capability work.
   - Use TypeName: 'research' for read-only work.
   - Include the contents of the target agent's definition (.agent-system/agents/<id>.md) in the Prompt so the subagent knows its role.
3. **No interactive-question tool**: this agent's canonical file says "surface it and stop" instead of using a live interactive-question mechanism (see its Handoff rules). In Antigravity that means ending your turn/report with the pending decision clearly stated, not attempting to block on a prompt mid-task.
