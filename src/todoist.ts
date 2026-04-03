import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface TdResult {
  stdout: string;
  stderr: string;
}

export interface TdError {
  message: string;
  code?: number | null;
  stdout?: string;
  stderr?: string;
}

/**
 * Execute a `td` CLI command and return stdout/stderr.
 *
 * @param args  Arguments to pass to `td` (e.g. `['today', '--json']`)
 * @param env   Optional environment variable overrides (e.g. `{ TODOIST_API_TOKEN: '...' }`)
 */
export async function runTd(
  args: string[],
  env?: Record<string, string>,
): Promise<TdResult> {
  const mergedEnv: NodeJS.ProcessEnv = { ...process.env, ...env };
  const { stdout, stderr } = await execFileAsync('td', args, {
    env: mergedEnv,
    // Give the CLI up to 30 seconds to respond
    timeout: 30_000,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

/**
 * Check whether the `td` CLI is available on PATH.
 * Returns the version string on success, or null if not found.
 */
export async function checkTdAvailable(): Promise<string | null> {
  try {
    const { stdout } = await runTd(['--version']);
    return stdout.trim();
  } catch {
    return null;
  }
}
