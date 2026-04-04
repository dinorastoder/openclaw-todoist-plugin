# openclaw-todoist-plugin

Todoist plugin for [OpenClaw](https://github.com/openclaw/openclaw) that exposes the [`td` CLI](https://github.com/Doist/todoist-cli) as native agent tools.

## What it provides

- Current OpenClaw native plugin entrypoint via `definePluginEntry(...)`
- Native Todoist tools backed by the `td` CLI
- `openclaw todoist status` for quick prerequisite checks
- Bundled skill docs at `skills/todoist/SKILL.md`
- npm-installable package: `openclaw-todoist-plugin`

## Prerequisites

Install the Todoist CLI:

```bash
npm install -g @doist/todoist-cli
```

Authentication is resolved in this order:

1. `plugins.entries.todoist.config.apiToken`
2. `TODOIST_API_TOKEN`
3. Credentials stored by `td auth login`

If you do not want to use a config token or environment variable, run:

```bash
td auth login
```

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
| `todoist_add_task` | Add a task with Todoist quick-add syntax |
| `todoist_complete_task` | Complete a task by name, `id:...`, or URL |
| `todoist_list_projects` | List projects |
| `todoist_run` | Run a raw `td` command |

Notes:

- `todoist_run` expects only the arguments after `td`
- `todoist_run` blocks interactive `td auth login`; run that in a terminal instead
- JSON-returning commands are parsed and surfaced with normalized errors when malformed

## CLI command

```bash
openclaw todoist status
```

The status command reports:

- whether `td` is installed
- the detected `td` version
- whether a plugin config token is present
- whether authentication appears usable

## Bundled skill

The manifest declares `./skills`, so OpenClaw can discover the bundled skill docs from:

```text
skills/todoist/SKILL.md
```

## Troubleshooting

### Plugin loads, but tools say `td` is missing

Install the CLI and ensure it is on `PATH` for the OpenClaw process:

```bash
npm install -g @doist/todoist-cli
openclaw todoist status
```

### `td` is installed, but authentication is unavailable

Use one of:

- `plugins.entries.todoist.config.apiToken`
- `TODOIST_API_TOKEN`
- `td auth login`

### Plugin config is missing

Add the `plugins.entries.todoist` block shown above and keep `todoist` in `plugins.allow`.

### Todoist command failed

Run the same command directly with `td` to compare output, for example:

```bash
td today --json
td project list --json
td auth status
```

The plugin returns normalized error text and includes `td stderr` when it helps diagnose the failure.

## Docker

The repository ships a `Dockerfile` and a `docker-compose.yml` so you can run
OpenClaw with the Todoist plugin and the `td` CLI entirely inside Docker —
without installing anything on your host beyond Docker itself.

### What the image contains

| Component | How it is installed |
| --- | --- |
| Node.js 22 | Base image (`node:22-slim`) |
| `git` | `apt-get install git` — available inside the container; source updates are pulled on the host then the image is rebuilt |
| `td` (Todoist CLI) | `npm install -g @doist/todoist-cli` |
| `openclaw` | `npm install -g openclaw` |
| This plugin | Built from source and registered with `openclaw plugins install -l .` |

### Build and run

```bash
# 1. (Optional) set your Todoist API token so the container picks it up
export TODOIST_API_TOKEN=your_token_here

# 2. Build the image and start the container
docker compose up --build
```

The OpenClaw config directory (`/root/.config/openclaw`) is stored in a named
Docker volume (`openclaw-config`) so your settings survive container restarts.

### Authentication inside the container

The `TODOIST_API_TOKEN` environment variable is forwarded into the container
automatically by `docker-compose.yml`.  You can also put it in a `.env` file
next to `docker-compose.yml`:

```
TODOIST_API_TOKEN=your_token_here
```

Alternatively, run `td auth login` inside the running container:

```bash
docker compose run --rm openclaw sh -c "td auth login"
```

### Keeping the source code up to date from git

To pull the latest plugin source from GitHub and rebuild the image:

```bash
git pull
docker compose build
docker compose up
```

Because `package.json` and `package-lock.json` are copied before the rest of
the source, Docker's layer cache means `npm ci` is only re-run when the
dependency manifests change, making subsequent rebuilds fast.

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
