---
name: todoist
description: "Manage Todoist tasks, projects, sections, labels, and comments through the Todoist REST API-backed plugin."
---

# Todoist

Use this skill when the user wants to view, add, update, complete, delete, or otherwise manage Todoist tasks, projects, sections, labels, and comments.

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

### `todoist_get_task`

Retrieve a single task by its id.

Parameters:

- `taskId` (string, required) — the Todoist task id

### `todoist_get_tasks`

List tasks, optionally filtered by project, section, parent task, or label.

Parameters:

- `projectId` (string, optional) — filter by project id
- `sectionId` (string, optional) — filter by section id
- `parentId` (string, optional) — filter by parent task id (returns sub-tasks)
- `label` (string, optional) — filter by label name

### `todoist_update_task`

Update a task. Only provide the fields you want to change.

Parameters:

- `taskId` (string, required) — the id of the task to update
- `content` (string, optional) — new task text
- `description` (string, optional) — new task description
- `dueString` (string, optional) — new due date in natural language (e.g. `"tomorrow"`, `"next Monday at 9am"`); use `"no date"` to clear
- `priority` (number, optional) — priority 1 (normal) to 4 (urgent)
- `labels` (string[], optional) — new set of label names
- `assigneeId` (string, optional) — user id to assign; empty string to unassign
- `deadlineDate` (string, optional) — deadline in `YYYY-MM-DD` format; empty string to clear

### `todoist_delete_task`

Permanently delete a task.

Parameters:

- `taskId` (string, required) — the Todoist task id

### `todoist_reopen_task`

Reopen (uncomplete) a previously completed task.

Parameters:

- `taskId` (string, required) — the Todoist task id

### `todoist_move_task`

Move a task to a different project, section, or parent. Provide exactly one of `projectId`, `sectionId`, or `parentId`.

Parameters:

- `taskId` (string, required) — the id of the task to move
- `projectId` (string, optional) — target project id
- `sectionId` (string, optional) — target section id
- `parentId` (string, optional) — target parent task id (makes the task a sub-task)

### `todoist_list_projects`

List projects.

Parameters: none.

### `todoist_add_project`

Create a new project.

Parameters:

- `name` (string, required) — project name
- `parentId` (string, optional) — parent project id (creates a sub-project)
- `color` (string, optional) — color key (e.g. `"red"`, `"blue"`, `"green"`)
- `isFavorite` (boolean, optional) — mark as favorite

### `todoist_update_project`

Update a project. Only provide the fields you want to change.

Parameters:

- `projectId` (string, required) — the project id
- `name` (string, optional) — new project name
- `color` (string, optional) — new color key
- `isFavorite` (boolean, optional) — mark as favorite

### `todoist_delete_project`

Permanently delete a project and all its tasks.

Parameters:

- `projectId` (string, required) — the project id

### `todoist_list_sections`

List sections, optionally filtered by project.

Parameters:

- `projectId` (string, optional) — filter by project id

### `todoist_add_section`

Create a new section inside a project.

Parameters:

- `name` (string, required) — section name
- `projectId` (string, required) — the project to add the section to

### `todoist_update_section`

Rename a section.

Parameters:

- `sectionId` (string, required) — the section id
- `name` (string, required) — new section name

### `todoist_delete_section`

Delete a section and its tasks.

Parameters:

- `sectionId` (string, required) — the section id

### `todoist_list_labels`

List all personal labels.

Parameters: none.

### `todoist_add_label`

Create a new personal label.

Parameters:

- `name` (string, required) — label name
- `color` (string, optional) — color key (e.g. `"red"`, `"blue"`, `"green"`)
- `isFavorite` (boolean, optional) — mark as favorite

### `todoist_update_label`

Update a personal label. Only provide the fields you want to change.

Parameters:

- `labelId` (string, required) — the label id
- `name` (string, optional) — new label name
- `color` (string, optional) — new color key
- `isFavorite` (boolean, optional) — mark as favorite

### `todoist_delete_label`

Delete a personal label.

Parameters:

- `labelId` (string, required) — the label id

### `todoist_get_comments`

Retrieve comments for a task or project. Provide either `taskId` or `projectId`.

Parameters:

- `taskId` (string, optional) — the task id to fetch comments for
- `projectId` (string, optional) — the project id to fetch comments for

### `todoist_add_comment`

Add a comment to a task or project. Provide either `taskId` or `projectId`.

Parameters:

- `content` (string, required) — comment text
- `taskId` (string, optional) — the task id to comment on
- `projectId` (string, optional) — the project id to comment on

## Authentication

The plugin resolves Todoist authentication in this order:

1. `plugins.entries.todoist.config.apiToken`
2. `TODOIST_API_TOKEN` environment variable

If the plugin reports missing or invalid authentication, use `openclaw todoist status` to confirm which prerequisite is missing, then set your API token from **Settings → Integrations → Developer** in Todoist.

## Workflow guidance

- When looking up a task by name, use `todoist_get_tasks` with a filter query or `todoist_today` / `todoist_inbox` first, then use the returned `id` for subsequent operations.
- Prefer `todoist_complete_task` (by id) over `todoist_delete_task` — completing preserves history.
- To move a task to a different project, use `todoist_move_task` with `projectId`.
- Use `todoist_update_task` with `dueString: "no date"` to clear a task's due date.
- `todoist_get_tasks` returns active (incomplete) tasks; use the Todoist filter tools (`todoist_today`, etc.) for more complex queries.

## Troubleshooting

- If authentication is missing or invalid, configure `apiToken` in the plugin config or set `TODOIST_API_TOKEN`
- If a task completion by name returns no match, use the task id or URL instead
- Run `openclaw todoist status` to verify your token is configured and valid
