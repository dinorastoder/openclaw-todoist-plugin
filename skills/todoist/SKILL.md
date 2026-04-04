---
name: todoist
description: "Manage Todoist tasks and projects through the Todoist REST API-backed plugin."
---

# Todoist

Use this skill when the user wants to view, add, complete, or inspect Todoist tasks and projects.

## Tools

### `todoist_today`

List tasks due today and overdue.

Parameters:

- `workspace` (string, optional) — filter by workspace name
- `personal` (boolean, optional) — when true, only show personal (non-workspace) tasks

### `todoist_inbox`

List inbox tasks.

Parameters: none.

### `todoist_add_task`

Add a task using Todoist natural language quick-add syntax.

Parameters:

- `content` (string, required) — task text with any Todoist natural language extras

Examples:

- `Buy groceries tomorrow`
- `Finish report Friday #Work`
- `Follow up every Monday at 9am`

### `todoist_complete_task`

Complete a task by reference. Prefer using the task id or URL when available.

Parameters:

- `ref` (string, required) — task id (e.g. `12345678`), Todoist task URL, or task name

### `todoist_list_projects`

List projects.

Parameters: none.

## Authentication

The plugin resolves Todoist authentication in this order:

1. `plugins.entries.todoist.config.apiToken`
2. `TODOIST_API_TOKEN` environment variable

If the plugin reports missing or invalid authentication, use `openclaw todoist status` to confirm which prerequisite is missing, then set your API token from **Settings → Integrations → Developer** in Todoist.

## Troubleshooting

- If authentication is missing or invalid, configure `apiToken` in the plugin config or set `TODOIST_API_TOKEN`
- If a task completion by name returns no match, use the task id or URL instead
- Run `openclaw todoist status` to verify your token is configured and valid
