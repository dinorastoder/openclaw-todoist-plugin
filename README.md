# openclaw-todoist-plugin

Todoist plugin for [OpenClaw](https://github.com/openclaw/openclaw) — enables the [`td` CLI](https://github.com/Doist/todoist-cli) as a tool in your AI assistant and adds an OpenClaw skill for Todoist task management.

## Features

- Exposes Todoist as native OpenClaw tools (`todoist.today`, `todoist.add`, `todoist.complete`, `todoist.inbox`, `todoist.projects`, `todoist.run`)
- Teaches your AI assistant to manage tasks, projects, and labels via the `SKILL.md` agent skill
- Supports authentication via API token (config, env var, or `td auth login`)
- Warns on startup if `td` is not installed

## Prerequisites

Install and authenticate the Todoist CLI:

```bash
npm install -g @doist/todoist-cli
td auth login
```

## Installation

```bash
openclaw plugins install openclaw-todoist-plugin
```

The package is also publishable on npm for standalone distribution:

```bash
npm install openclaw-todoist-plugin
openclaw plugins install -l ./node_modules/openclaw-todoist-plugin
```

Or for local development:

```bash
openclaw plugins install -l .
```

## Configuration

The plugin reads your Todoist API token from the first available source:

1. `apiToken` in the plugin config (set in the OpenClaw UI or config file)
2. `TODOIST_API_TOKEN` environment variable
3. Token stored by `td auth login`

### Optional: set API token in OpenClaw config

```json
{
  "plugins": {
    "todoist": {
      "apiToken": "your-api-token-here"
    }
  }
}
```

Get your API token from [Todoist Settings → Integrations → Developer](https://todoist.com/app/settings/integrations/developer).

## Agent Skill

The included `SKILL.md` teaches your AI assistant the available Todoist tools. Install it via the OpenClaw skill registry:

```bash
openclaw skill install todoist
```

Or it is bundled automatically when the plugin is installed.

## Available Tools

| Tool | Description |
|------|-------------|
| `todoist.today` | Tasks due today and overdue |
| `todoist.inbox` | Inbox tasks |
| `todoist.add` | Quick-add a task (natural language) |
| `todoist.complete` | Complete a task by name or reference |
| `todoist.projects` | List all projects |
| `todoist.run` | Run any `td` command directly |

## OpenClaw CLI Commands

```bash
openclaw todoist status    # Check td CLI availability and auth status
```

## Usage Examples

After installation, ask your AI assistant:

- *"Show me my tasks for today"*
- *"Add a task: buy groceries tomorrow"*
- *"What's in my inbox?"*
- *"Complete the task 'Buy milk'"*
- *"List my projects"*
- *"Show tasks in my Work project"*

## Development

```bash
npm install
npm run build       # compile TypeScript
npm run type-check  # type check without emitting
npm test            # run tests
```

## Publishing

- **ClawHub:** push a release tag (for example `2026.4.3` or `v2026.4.3`) or run the existing workflow manually.
- **npm:** add an `NPM_TOKEN` repository secret, then push the same release tag or run the **Publish to npm** workflow manually.
- Tags containing `-beta` publish to the npm `beta` dist-tag; all other tags publish to `latest`.

## License

MIT
