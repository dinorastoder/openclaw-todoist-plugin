---
name: todoist
description: "Manage Todoist tasks and projects through the td CLI-backed Todoist plugin."
---

# Todoist

Use this skill when the user wants to view, add, complete, or inspect Todoist tasks and projects.

## Tools

### `todoist_today`

List tasks due today and overdue.

Parameters:

- `workspace` (string, optional)
- `personal` (boolean, optional)

### `todoist_inbox`

List inbox tasks.

Parameters: none.

### `todoist_add_task`

Add a task with Todoist quick-add syntax.

Parameters:

- `content` (string, required) — task text with any Todoist natural language extras

Examples:

- `Buy groceries tomorrow`
- `Finish report Friday #Work`
- `Follow up every Monday at 9am`

### `todoist_complete_task`

Complete a task by reference.

Parameters:

- `ref` (string, required) — task name, `id:123`, or Todoist URL

### `todoist_list_projects`

List projects.

Parameters: none.

### `todoist_run`

Run a raw `td` command.

Parameters:

- `args` (string[], required) — arguments after `td`

Use this when a dedicated tool is not enough, but do not use it for interactive `td auth login`.

## Authentication

The plugin resolves Todoist authentication in this order:

1. `plugins.entries.todoist.config.apiToken`
2. `TODOIST_API_TOKEN`
3. `td auth login`

If the plugin reports missing authentication, use `openclaw todoist status` to confirm which prerequisite is missing.

## Troubleshooting

- If the plugin is loaded but `td` is missing, install `@doist/todoist-cli`
- If `td` is installed but auth is missing, configure `apiToken`, set `TODOIST_API_TOKEN`, or run `td auth login`
- If a command fails, inspect the returned `td stderr` message and compare with running the same command directly in a terminal
