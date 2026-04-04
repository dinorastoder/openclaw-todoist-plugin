import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TdCommandError,
  getTdStatus,
  runTd,
} from '../src/todoist.js';

afterEach(() => {
  delete process.env.TODOIST_API_TOKEN;
});

describe('runTd', () => {
  it('passes args and plugin token to td', async () => {
    const execFileImpl = vi.fn(async () => ({
      stdout: '{"tasks":[]}',
      stderr: '',
    }));

    const result = await runTd(['today', '--json'], {
      apiToken: 'plugin-token',
      execFileImpl,
    });

    expect(execFileImpl).toHaveBeenCalledWith(
      'td',
      ['today', '--json'],
      expect.objectContaining({
        encoding: 'utf8',
        timeout: 30_000,
        env: expect.objectContaining({
          TODOIST_API_TOKEN: 'plugin-token',
        }),
      }),
    );
    expect(result.json).toEqual({ tasks: [] });
  });

  it('normalizes authentication failures', async () => {
    const execFileImpl = vi.fn(async () => {
      throw Object.assign(new Error('failed'), {
        code: 1,
        stderr: 'authentication required: run td auth login',
      });
    });

    await expect(runTd(['today'], { execFileImpl })).rejects.toMatchObject({
      kind: 'auth_missing',
      message:
        'Todoist CLI authentication is not available. Set `plugins.entries.todoist.config.apiToken`, set `TODOIST_API_TOKEN`, or run `td auth login`.',
    });
  });

  it('normalizes invalid argument failures', async () => {
    const execFileImpl = vi.fn(async () => {
      throw Object.assign(new Error('failed'), {
        code: 1,
        stderr: 'unknown command "todya" for "td"',
      });
    });

    await expect(runTd(['todya'], { execFileImpl })).rejects.toMatchObject({
      kind: 'invalid_arguments',
      message: 'The Todoist CLI command arguments were rejected by `td`.',
    });
  });

  it('normalizes unknown option failures (e.g. --json not supported by add)', async () => {
    const execFileImpl = vi.fn(async () => {
      throw Object.assign(new Error('failed'), {
        code: 1,
        stderr: "error: unknown option '--json'",
      });
    });

    await expect(runTd(['add', 'Buy milk', '--json'], { execFileImpl })).rejects.toMatchObject({
      kind: 'invalid_arguments',
      message: 'The Todoist CLI command arguments were rejected by `td`.',
    });
  });

  it('reports malformed json cleanly', async () => {
    const execFileImpl = vi.fn(async () => ({
      stdout: '{not json',
      stderr: '',
    }));

    await expect(runTd(['today', '--json'], { execFileImpl })).rejects.toBeInstanceOf(
      TdCommandError,
    );
    await expect(runTd(['today', '--json'], { execFileImpl })).rejects.toMatchObject({
      kind: 'malformed_json',
    });
  });
});

describe('getTdStatus', () => {
  it('uses plugin config token as a successful auth signal', async () => {
    const execFileImpl = vi.fn(async () => ({
      stdout: 'v1.2.3',
      stderr: '',
    }));

    const status = await getTdStatus({
      apiToken: 'plugin-token',
      execFileImpl,
    });

    expect(status).toEqual({
      available: true,
      version: 'v1.2.3',
      pluginConfigTokenPresent: true,
      envTokenPresent: false,
      authUsable: true,
      authSource: 'plugin-config',
      authMessage: 'Plugin config token is present.',
    });
    expect(execFileImpl).toHaveBeenCalledTimes(1);
  });

  it('reports td missing cleanly', async () => {
    const execFileImpl = vi.fn(async () => {
      throw Object.assign(new Error('spawn td ENOENT'), {
        code: 'ENOENT',
      });
    });

    const status = await getTdStatus({ execFileImpl });

    expect(status.available).toBe(false);
    expect(status.authUsable).toBe(false);
    expect(status.authMessage).toContain('Todoist CLI `td` is not installed');
  });
});
