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

## Docker (running inside the OpenClaw Docker image)

The `td` binary must be present **inside the container** — installing it on
your host machine has no effect because OpenClaw runs in an isolated Docker
environment.

The workflow below assumes you cloned the
[openclaw](https://github.com/openclaw/openclaw) repository.

### Step 1 — create `Dockerfile.local`

In the root of the cloned `openclaw` repository, create a file called
`Dockerfile.local`.  This file is not tracked by the openclaw git repository,
so it will never be overwritten by `git pull`:

```dockerfile
# Dockerfile.local — extends the openclaw image with the Todoist CLI (td).
# Place this file in the root of your cloned openclaw repo.
# Not tracked by openclaw git — safe to keep across git pulls.
FROM openclaw:local

USER root
RUN npm install -g @doist/todoist-cli
USER node
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

Add your Todoist API token to the `.env` file that openclaw's setup script
creates (it is already listed in openclaw's `.gitignore`):

```
TODOIST_API_TOKEN=your_token_here
```

### Step 3 — initial setup with `docker-setup.sh`

openclaw ships `scripts/docker/setup.sh` which handles the full first-time
setup: it builds the `openclaw:local` image, creates config directories,
generates a gateway token, writes `.env`, runs interactive onboarding, and
starts the gateway.  Run it once:

```bash
bash scripts/docker/setup.sh
```

After it completes, extend the image to add `td`, then restart the services to
pick up the new image:

```bash
docker build -f Dockerfile.local -t openclaw:local .
docker compose up -d
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

When a new version of openclaw is released, rebuild both images and restart:

```bash
git pull                                              # update openclaw source
docker build -t openclaw:local .                      # rebuild the base image
docker build -f Dockerfile.local -t openclaw:local .  # re-add td CLI
docker compose up -d                                  # restart with new images
```

There is no need to re-run `docker-setup.sh` for routine updates — it is only
needed the first time.  `Dockerfile.local` and `docker-compose.override.yml`
are not part of the openclaw upstream tree, so `git pull` never touches them.
The plugin installation in the config volume also persists across rebuilds.

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
