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

If OpenClaw logs this after installation:

```text
[plugins] plugins.allow is empty; discovered non-bundled plugins may auto-load: todoist ...
```

that is a trust warning from OpenClaw, not a plugin failure. Add the plugin id to your trusted plugin allowlist:

```json
{
  "plugins": {
    "allow": ["todoist"]
  }
}
```

The plugin id is `todoist`, which matches `openclaw.plugin.json`.

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
- **npm:** configure npm Trusted Publisher once, then push the same release tag or run the **Publish to npm** workflow manually.
- Tags containing `-beta` publish to the npm `beta` dist-tag; all other tags publish to `latest`.

### npm Trusted Publisher setup (manual, one-time)

Before the GitHub Actions workflow can publish to npm without an `NPM_TOKEN`, configure npm Trusted Publisher for this package on npmjs.com:

1. Sign in to npmjs.com as an owner of the `openclaw-todoist-plugin` package.
2. Open the package settings and add a **Trusted Publisher**.
3. Choose **GitHub Actions** as the provider.
4. Authorize this repository: `dinorastoder/openclaw-todoist-plugin`.
5. Set the workflow file to `.github/workflows/npm-publish.yml`.
6. Save the publisher settings in npm.

After that, GitHub Actions can publish with provenance directly from this repository and no `NPM_TOKEN` repository secret is needed.

## License

MIT
