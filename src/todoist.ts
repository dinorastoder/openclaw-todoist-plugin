import { execFile, type ExecFileOptionsWithStringEncoding } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 30_000;
const TD_BINARY = 'td';

const AUTH_FAILURE_PATTERN =
  /(auth(entication)?|token|login).*(missing|required|expired|invalid|failed|not found|not authenticated)|not logged in|run .*td auth login/i;
const INVALID_ARGUMENT_PATTERN =
  /\b(unknown (command|flag|option)|invalid (argument|option)|requires? at least|usage:|too many arguments|accepts? \d+ arg|flag needs an argument)\b/i;

export type TdErrorKind =
  | 'binary_missing'
  | 'auth_missing'
  | 'invalid_arguments'
  | 'command_failed'
  | 'malformed_json'
  | 'timeout';

export type TdCommandResult = {
  command: string;
  stdout: string;
  stderr: string;
  json?: unknown;
};

export type TdStatus = {
  available: boolean;
  version: string | null;
  pluginConfigTokenPresent: boolean;
  envTokenPresent: boolean;
  authUsable: boolean;
  authSource: 'plugin-config' | 'environment' | 'td-auth' | 'missing' | 'unknown';
  authMessage: string;
};

type ExecFileResult = {
  stdout: string;
  stderr: string;
};

export type ExecFileLike = (
  file: string,
  args: readonly string[],
  options: ExecFileOptionsWithStringEncoding,
) => Promise<ExecFileResult>;

type TdCommandOptions = {
  apiToken?: string;
  expectJson?: boolean;
  timeoutMs?: number;
  execFileImpl?: ExecFileLike;
};

type ExecFileFailure = Error & {
  code?: string | number | null;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
  signal?: NodeJS.Signals | null;
  killed?: boolean;
};

const defaultExecFile: ExecFileLike = async (file, args, options) => {
  const result = await execFileAsync(file, args, {
    ...options,
    encoding: options.encoding ?? 'utf8',
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

export class TdCommandError extends Error {
  readonly kind: TdErrorKind;
  readonly command: string;
  readonly exitCode?: string | number | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor(params: {
    kind: TdErrorKind;
    message: string;
    command: string;
    exitCode?: string | number | null;
    stdout?: string;
    stderr?: string;
  }) {
    super(params.message);
    this.name = 'TdCommandError';
    this.kind = params.kind;
    this.command = params.command;
    this.exitCode = params.exitCode;
    this.stdout = params.stdout ?? '';
    this.stderr = params.stderr ?? '';
  }
}

export function getPluginApiToken(pluginConfig?: Record<string, unknown>): string | undefined {
  const token = pluginConfig?.['apiToken'];
  return typeof token === 'string' && token.trim() ? token.trim() : undefined;
}

export function getTdCommandString(args: readonly string[]): string {
  return [TD_BINARY, ...args].join(' ');
}

export function isTdCommandError(error: unknown): error is TdCommandError {
  return error instanceof TdCommandError;
}

export async function runTd(
  args: readonly string[],
  options: TdCommandOptions = {},
): Promise<TdCommandResult> {
  const command = getTdCommandString(args);
  const execFileImpl = options.execFileImpl ?? defaultExecFile;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const env = {
    ...process.env,
    ...(options.apiToken ? { TODOIST_API_TOKEN: options.apiToken } : {}),
  };

  let stdout = '';
  let stderr = '';

  try {
    const result = await execFileImpl(TD_BINARY, args, {
      env,
      encoding: 'utf8',
      timeout: timeoutMs,
    });
    stdout = normalizeStream(result.stdout);
    stderr = normalizeStream(result.stderr);
  } catch (error: unknown) {
    throw normalizeTdError(error, {
      command,
      stdout,
      stderr,
    });
  }

  const jsonRequested = options.expectJson ?? args.includes('--json');
  if (!jsonRequested) {
    return { command, stdout, stderr };
  }

  try {
    return {
      command,
      stdout,
      stderr,
      json: stdout ? JSON.parse(stdout) : null,
    };
  } catch {
    throw new TdCommandError({
      kind: 'malformed_json',
      command,
      stdout,
      stderr,
      message:
        "Todoist CLI returned malformed JSON for a `--json` command. Re-run the command directly with `td` to inspect the raw output.",
    });
  }
}

export async function getTdStatus(
  options: Omit<TdCommandOptions, 'expectJson'> = {},
): Promise<TdStatus> {
  const pluginConfigTokenPresent = Boolean(options.apiToken?.trim());
  const envTokenPresent = Boolean(process.env.TODOIST_API_TOKEN?.trim());

  try {
    const versionResult = await runTd(['--version'], {
      ...options,
      timeoutMs: 10_000,
    });
    const version = versionResult.stdout || 'installed';

    if (pluginConfigTokenPresent) {
      return {
        available: true,
        version,
        pluginConfigTokenPresent,
        envTokenPresent,
        authUsable: true,
        authSource: 'plugin-config',
        authMessage: 'Plugin config token is present.',
      };
    }

    if (envTokenPresent) {
      return {
        available: true,
        version,
        pluginConfigTokenPresent,
        envTokenPresent,
        authUsable: true,
        authSource: 'environment',
        authMessage: 'TODOIST_API_TOKEN is set in the environment.',
      };
    }

    try {
      const authResult = await runTd(['auth', 'status'], {
        ...options,
        timeoutMs: 10_000,
      });

      return {
        available: true,
        version,
        pluginConfigTokenPresent,
        envTokenPresent,
        authUsable: true,
        authSource: 'td-auth',
        authMessage: firstLine(authResult.stdout) || 'td auth login appears usable.',
      };
    } catch (error: unknown) {
      if (isTdCommandError(error)) {
        return {
          available: true,
          version,
          pluginConfigTokenPresent,
          envTokenPresent,
          authUsable: false,
          authSource: error.kind === 'auth_missing' ? 'missing' : 'unknown',
          authMessage: error.message,
        };
      }

      return {
        available: true,
        version,
        pluginConfigTokenPresent,
        envTokenPresent,
        authUsable: false,
        authSource: 'unknown',
        authMessage: 'Unable to verify Todoist CLI authentication.',
      };
    }
  } catch (error: unknown) {
    if (isTdCommandError(error) && error.kind === 'binary_missing') {
      return {
        available: false,
        version: null,
        pluginConfigTokenPresent,
        envTokenPresent,
        authUsable: false,
        authSource: 'missing',
        authMessage: error.message,
      };
    }

    throw error;
  }
}

function normalizeTdError(
  error: unknown,
  context: {
    command: string;
    stdout: string;
    stderr: string;
  },
): TdCommandError {
  const failure = error as ExecFileFailure;
  const stdout = context.stdout || normalizeStream(failure.stdout);
  const stderr = context.stderr || normalizeStream(failure.stderr);
  const combinedOutput = [stderr, stdout].filter(Boolean).join('\n');

  if (failure.code === 'ENOENT') {
    return new TdCommandError({
      kind: 'binary_missing',
      command: context.command,
      exitCode: failure.code,
      stdout,
      stderr,
      message:
        "Todoist CLI `td` is not installed or not on PATH. Install it with `npm install -g @doist/todoist-cli`.",
    });
  }

  if (failure.code === 'ETIMEDOUT' || /timed out/i.test(failure.message) || failure.killed) {
    return new TdCommandError({
      kind: 'timeout',
      command: context.command,
      exitCode: failure.code,
      stdout,
      stderr,
      message: 'Todoist CLI did not respond within 30 seconds.',
    });
  }

  if (AUTH_FAILURE_PATTERN.test(combinedOutput)) {
    return new TdCommandError({
      kind: 'auth_missing',
      command: context.command,
      exitCode: failure.code,
      stdout,
      stderr,
      message:
        "Todoist CLI authentication is not available. Set `plugins.entries.todoist.config.apiToken`, set `TODOIST_API_TOKEN`, or run `td auth login`.",
    });
  }

  if (INVALID_ARGUMENT_PATTERN.test(combinedOutput)) {
    return new TdCommandError({
      kind: 'invalid_arguments',
      command: context.command,
      exitCode: failure.code,
      stdout,
      stderr,
      message: 'The Todoist CLI command arguments were rejected by `td`.',
    });
  }

  return new TdCommandError({
    kind: 'command_failed',
    command: context.command,
    exitCode: failure.code,
    stdout,
    stderr,
    message: `Todoist CLI command failed.${combinedOutput ? ` ${firstLine(combinedOutput)}` : ''}`,
  });
}

function normalizeStream(value: string | Buffer | undefined): string {
  return String(value ?? '').trim();
}

function firstLine(value: string): string {
  return value
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) ?? '';
}
