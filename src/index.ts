import { runTd, checkTdAvailable } from './todoist.js';

// ---------------------------------------------------------------------------
// Lightweight plugin API typings
//
// We define our own interfaces rather than importing from `openclaw/plugin-sdk`
// to avoid a hard compile-time dependency (openclaw is a peerDependency).
// At runtime OpenClaw passes the real object that satisfies this shape.
// ---------------------------------------------------------------------------

interface PluginLogger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

interface RespondFn {
  (ok: boolean, data: unknown): unknown;
}

interface GatewayMethodContext {
  params: Record<string, unknown>;
  respond: RespondFn;
}

interface PluginCliContext {
  program: {
    command(name: string): PluginCliContext['program'];
    description(desc: string): PluginCliContext['program'];
    option(flags: string, desc: string): PluginCliContext['program'];
    action(fn: (...args: unknown[]) => void | Promise<void>): PluginCliContext['program'];
  };
  config: Record<string, unknown>;
}

interface PluginApi {
  id: string;
  name: string;
  config: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  logger: PluginLogger;
  registerGatewayMethod(
    name: string,
    handler: (ctx: GatewayMethodContext) => Promise<unknown>,
  ): void;
  registerCli(
    registrar: (ctx: PluginCliContext) => void | Promise<void>,
  ): void;
  on(
    hookName: string,
    handler: (...args: unknown[]) => void | Promise<void>,
  ): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VERSION = '1.0.0';

function getEnv(api: PluginApi): Record<string, string> {
  const token = api.pluginConfig?.['apiToken'] as string | undefined;
  return token ? { TODOIST_API_TOKEN: token } : {};
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return (value as unknown[]).map((v) => String(v));
  }
  return [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const todoistPlugin = {
  id: 'todoist',
  name: 'Todoist',
  version: VERSION,
  description: 'Todoist integration for OpenClaw via the td CLI',

  register(api: PluginApi) {
    const env = () => getEnv(api);

    // ── Gateway methods (tools exposed to the agent) ──────────────────────

    /**
     * todoist.run
     * Run an arbitrary `td` command.
     * Params: { args: string[] }
     * Returns: { output: string, stderr: string } | { error: string }
     */
    api.registerGatewayMethod('todoist.run', async ({ params, respond }) => {
      const args = asStringArray(params['args']);
      if (args.length === 0) {
        return respond(false, { error: 'No arguments provided. Pass the td command arguments as an array in "args".' });
      }
      try {
        const { stdout, stderr } = await runTd(args, env());
        return respond(true, { output: stdout, stderr });
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        return respond(false, {
          error: err.message,
          stderr: err.stderr ?? '',
          stdout: err.stdout ?? '',
        });
      }
    });

    /**
     * todoist.today
     * Get tasks due today and overdue.
     * Params: { workspace?: string, personal?: boolean }
     * Returns: { output: string }
     */
    api.registerGatewayMethod('todoist.today', async ({ params, respond }) => {
      const args: string[] = ['today', '--json'];
      const workspace = asString(params['workspace']);
      if (workspace) args.push('--workspace', workspace);
      if (params['personal'] === true) args.push('--personal');
      try {
        const { stdout, stderr } = await runTd(args, env());
        return respond(true, { output: stdout, stderr });
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        return respond(false, { error: err.message, stderr: err.stderr ?? '' });
      }
    });

    /**
     * todoist.add
     * Quick-add a task using natural language.
     * Params: { content: string }
     * Returns: { output: string }
     */
    api.registerGatewayMethod('todoist.add', async ({ params, respond }) => {
      const content = asString(params['content']);
      if (!content) {
        return respond(false, { error: 'Missing required parameter: content' });
      }
      try {
        const { stdout, stderr } = await runTd(['add', content, '--json'], env());
        return respond(true, { output: stdout, stderr });
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        return respond(false, { error: err.message, stderr: err.stderr ?? '' });
      }
    });

    /**
     * todoist.complete
     * Complete a task by name or reference.
     * Params: { ref: string }
     * Returns: { output: string }
     */
    api.registerGatewayMethod('todoist.complete', async ({ params, respond }) => {
      const ref = asString(params['ref']);
      if (!ref) {
        return respond(false, { error: 'Missing required parameter: ref (task name, id:xxx, or URL)' });
      }
      try {
        const { stdout, stderr } = await runTd(['task', 'complete', ref], env());
        return respond(true, { output: stdout, stderr });
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        return respond(false, { error: err.message, stderr: err.stderr ?? '' });
      }
    });

    /**
     * todoist.inbox
     * Get inbox tasks.
     * Params: {}
     * Returns: { output: string }
     */
    api.registerGatewayMethod('todoist.inbox', async ({ respond }) => {
      try {
        const { stdout, stderr } = await runTd(['inbox', '--json'], env());
        return respond(true, { output: stdout, stderr });
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        return respond(false, { error: err.message, stderr: err.stderr ?? '' });
      }
    });

    /**
     * todoist.projects
     * List all projects.
     * Params: {}
     * Returns: { output: string }
     */
    api.registerGatewayMethod('todoist.projects', async ({ respond }) => {
      try {
        const { stdout, stderr } = await runTd(['project', 'list', '--json'], env());
        return respond(true, { output: stdout, stderr });
      } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        return respond(false, { error: err.message, stderr: err.stderr ?? '' });
      }
    });

    // ── Lifecycle hooks ───────────────────────────────────────────────────

    api.on('gateway_start', async () => {
      const version = await checkTdAvailable();
      if (version) {
        api.logger.info(`[Todoist] td CLI available (${version})`);
      } else {
        api.logger.warn(
          '[Todoist] td CLI not found on PATH. ' +
          'Install with: npm install -g @doist/todoist-cli\n' +
          '  Then authenticate: td auth login',
        );
      }
    });

    // ── OpenClaw CLI sub-commands ─────────────────────────────────────────

    api.registerCli(({ program }) => {
      const td = program
        .command('todoist')
        .description('Todoist CLI integration');

      td.command('status')
        .description('Check td CLI availability and authentication status')
        .action(async () => {
          const version = await checkTdAvailable();
          if (!version) {
            console.error('td CLI not found. Install with: npm install -g @doist/todoist-cli');
            process.exitCode = 1;
            return;
          }
          console.log(`td CLI: ${version}`);
          try {
            const { stdout } = await runTd(['auth', 'status'], env());
            console.log(stdout);
          } catch (error: unknown) {
            const err = error as { stderr?: string; message: string };
            console.error('Auth check failed:', err.stderr || err.message);
            process.exitCode = 1;
          }
        });
    });

    api.logger.info(`[Todoist] v${VERSION} plugin registered`);
  },
};

export default todoistPlugin;
