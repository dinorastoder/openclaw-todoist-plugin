# openclaw-todoist-plugin

Todoist plugin for [OpenClaw](https://github.com/openclaw/openclaw) that exposes the [Todoist REST API](https://developer.todoist.com/api/v1/) as native agent tools via the [`@doist/todoist-sdk`](https://github.com/Doist/todoist-sdk-typescript).

## What it provides

- Current OpenClaw native plugin entrypoint via `definePluginEntry(...)`
- Native Todoist tools backed by the Todoist REST API (no external CLI required)
- `openclaw todoist status` for quick auth readiness checks
- Bundled skill docs at `skills/todoist/SKILL.md`
- npm-installable package: `openclaw-todoist-plugin`

## Prerequisites

You need a Todoist API token. Get one from **Settings → Integrations → Developer** in Todoist.

Authentication is resolved in this order:

1. `plugins.entries.todoist.config.apiToken`
2. `TODOIST_API_TOKEN` environment variable

## Install

```bash
openclaw plugins install openclaw-todoist-plugin
```

For local development:

```bash
openclaw plugins install -l .
```

## OpenClaw config

Enable the plugin under `plugins.entries.todoist`:

```json
{
  "plugins": {
    "allow": ["todoist"],
    "entries": {
      "todoist": {
        "enabled": true,
        "config": {
          "apiToken": "your-api-token-here"
        }
      }
    }
  }
}
```

The plugin id stays `todoist`.

## Tools

| Tool | Description |
| --- | --- |
| `todoist_today` | List tasks due today and overdue |
| `todoist_inbox` | List inbox tasks |
| `todoist_add_task` | Add a task with Todoist natural language quick-add syntax |
| `todoist_complete_task` | Complete a task by id, URL, or name |
| `todoist_list_projects` | List projects |

Notes:

- `todoist_add_task` accepts natural language text (e.g. `"Buy groceries tomorrow #Work"`) via the Todoist quick-add API
- `todoist_complete_task` accepts a task id (numeric), a Todoist task URL, or a task name; prefer ids or URLs when available
- `todoist_today` accepts an optional `workspace` (filter by workspace name) and `personal` (personal tasks only) parameter

## CLI command

```bash
openclaw todoist status
```

The status command reports:

- whether a plugin config token is present
- whether a `TODOIST_API_TOKEN` environment variable is set
- whether authentication is usable (by verifying the token against the API)

## Bundled skill

The manifest declares `./skills`, so OpenClaw can discover the bundled skill docs from:

```text
skills/todoist/SKILL.md
```

## Troubleshooting

### Plugin loads, but tools say the API token is not configured

Set the token in your OpenClaw config:

```json
{
  "plugins": {
    "entries": {
      "todoist": {
        "config": {
          "apiToken": "your-api-token-here"
        }
      }
    }
  }
}
```

Or set the environment variable:

```bash
export TODOIST_API_TOKEN=your-api-token-here
```

### API token is present but authentication fails

Verify the token is valid at **Settings → Integrations → Developer** in Todoist.
Run `openclaw todoist status` to confirm which prerequisite is missing.

### Plugin config is missing

Add the `plugins.entries.todoist` block shown above and keep `todoist` in `plugins.allow`.

## Docker (running inside the OpenClaw Docker image)

No extra binary is needed — the plugin calls the Todoist REST API directly.
Just make your API token available inside the container via the OpenClaw config or the
`TODOIST_API_TOKEN` environment variable.

The workflow below assumes you cloned the
[openclaw](https://github.com/openclaw/openclaw) repository.

### Step 1 — expose the API token

Add your Todoist API token to the `.env` file that openclaw's setup script
creates (it is already listed in openclaw's `.gitignore`):

```
TODOIST_API_TOKEN=your_token_here
```

### Step 2 — create `docker-compose.override.yml`

Docker Compose automatically merges `docker-compose.override.yml` with
`docker-compose.yml`.  Because it is also not tracked by openclaw's git, it
survives `git pull` untouched.

Create `docker-compose.override.yml` in the same directory:

```yaml
# docker-compose.override.yml — local overrides for openclaw.
# Merged automatically by docker compose. Not tracked by openclaw git.
services:
  openclaw-gateway:
    environment:
      TODOIST_API_TOKEN: ${TODOIST_API_TOKEN:-}
  openclaw-cli:
    environment:
      TODOIST_API_TOKEN: ${TODOIST_API_TOKEN:-}
```

### Step 3 — initial setup with `docker-setup.sh`

openclaw ships `scripts/docker/setup.sh` which handles the full first-time
setup: it builds the `openclaw:local` image, creates config directories,
generates a gateway token, writes `.env`, runs interactive onboarding, and
starts the gateway.  Run it once:

```bash
bash scripts/docker/setup.sh
```

Install the plugin once — it is persisted in the config volume:

```bash
docker compose exec openclaw-cli \
  openclaw plugins install openclaw-todoist-plugin
```

Verify everything is working:

```bash
docker compose exec openclaw-cli openclaw todoist status
```

### Keeping up to date after `git pull`

```bash
git pull                      # update openclaw source
docker build -t openclaw:local .
docker compose up -d
```

There is no need to re-run `docker-setup.sh` for routine updates.
`docker-compose.override.yml` is not part of the openclaw upstream tree, so
`git pull` never touches it.  The plugin installation in the config volume also
persists across rebuilds.

## Development

```bash
npm ci
npm run type-check
npm run build
npm test
```

Optional package-content check:

```bash
npm pack --dry-run
```

## Publish

`npm publish` is guarded by:

```bash
npm run sync-version && npm run type-check && npm run build && npm test
```

The published package includes:

- `dist/`
- `openclaw.plugin.json`
- `skills/`
- `README.md`
