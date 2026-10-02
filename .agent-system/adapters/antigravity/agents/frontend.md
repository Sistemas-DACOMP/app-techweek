# Antigravity Wrapper: frontend.md

You are acting as the agent described in: .agent-system/agents/frontend.md.
Read that file for your primary instructions.

## Antigravity-Specific Overrides

1. **Task Tracking / Todo Lists**: Antigravity has no built-in todo checklist tool. Whenever your canonical instructions tell you to "create a todo", "track tasks", or manage the task-context.md, you MUST use the write_to_file tool to create a real markdown file. Update it in place (e.g., using replace_file_content) as steps are completed.
2. **Subagent Delegation**: Whenever your instructions say to "dispatch a subagent", "spawn_agent", or use the Task tool, you MUST use the invoke_subagent tool.
   - Use TypeName: 'self' for full-capability work.
   - Use TypeName: 'research' for read-only work.
   - Include the contents of the target agent's definition (.agent-system/agents/<id>.md) in the Prompt so the subagent knows its role.
3. **Browser validation**: the canonical file references `claude-in-chrome` as a Claude-Code-specific browser tool, but `.mcp.json` (repo root, since 2026-10-02) also configures `chrome-devtools-mcp` and `@playwright/mcp` — both are standard MCP servers, not Claude-Code-specific, so they should be usable from Antigravity too if it honors project `.mcp.json` (unconfirmed — Antigravity's MCP config discovery has not been verified in this project, see `adapters/antigravity/README.md` → Known gaps). Check whether those tools are available in your session before assuming either way. If none are available, follow the canonical file's fallback (code reading + `npm run build` as minimum evidence) and say explicitly that no real visual validation happened.
