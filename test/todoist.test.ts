import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoistRequestError } from '@doist/todoist-sdk';
import {
  createApi,
  getApiStatus,
  getPluginApiToken,
  resolveApiToken,
} from '../src/todoist.js';

// Mock the TodoistApi so getApiStatus tests don't hit the network.
vi.mock('@doist/todoist-sdk', async () => {
  const actual = await vi.importActual<typeof import('@doist/todoist-sdk')>('@doist/todoist-sdk');
  return {
    ...actual,
    TodoistApi: vi.fn().mockReturnValue({
      getProjects: vi.fn().mockResolvedValue({ results: [], nextCursor: null }),
    }),
  };
});

afterEach(() => {
  delete process.env.TODOIST_API_TOKEN;
  vi.clearAllMocks();
});

describe('getPluginApiToken', () => {
  it('returns the token from plugin config', () => {
    expect(getPluginApiToken({ apiToken: 'abc' })).toBe('abc');
  });

  it('trims whitespace', () => {
    expect(getPluginApiToken({ apiToken: '  tok  ' })).toBe('tok');
  });

  it('returns undefined when apiToken is empty or missing', () => {
    expect(getPluginApiToken({})).toBeUndefined();
    expect(getPluginApiToken({ apiToken: '   ' })).toBeUndefined();
    expect(getPluginApiToken(undefined)).toBeUndefined();
  });
});

describe('resolveApiToken', () => {
  it('prefers plugin config token over env var', () => {
    process.env.TODOIST_API_TOKEN = 'env-token';
    expect(resolveApiToken({ apiToken: 'config-token' })).toBe('config-token');
  });

  it('falls back to TODOIST_API_TOKEN env var', () => {
    process.env.TODOIST_API_TOKEN = 'env-token';
    expect(resolveApiToken({})).toBe('env-token');
  });

  it('returns undefined when no token is available', () => {
    expect(resolveApiToken({})).toBeUndefined();
  });
});

describe('createApi', () => {
  it('returns a TodoistApi-compatible instance', () => {
    const api = createApi('test-token');
    expect(api).toBeDefined();
    expect(typeof api.getProjects).toBe('function');
  });
});

describe('getApiStatus', () => {
  it('reports missing when no token is present', async () => {
    const status = await getApiStatus({});
    expect(status.tokenPresent).toBe(false);
    expect(status.tokenSource).toBe('missing');
    expect(status.authUsable).toBe(false);
    expect(status.authMessage).toContain('No Todoist API token');
  });

  it('reports plugin-config as token source when pluginConfigToken is provided and API succeeds', async () => {
    const status = await getApiStatus({ pluginConfigToken: 'plugin-tok' });
    expect(status.tokenPresent).toBe(true);
    expect(status.tokenSource).toBe('plugin-config');
    expect(status.authUsable).toBe(true);
  });

  it('reports environment as token source when only env var is set and API succeeds', async () => {
    process.env.TODOIST_API_TOKEN = 'env-tok';
    const status = await getApiStatus({});
    expect(status.tokenPresent).toBe(true);
    expect(status.tokenSource).toBe('environment');
    expect(status.authUsable).toBe(true);
  });

  it('reports auth failure when API returns a 401 error', async () => {
    const { TodoistApi } = await import('@doist/todoist-sdk');
    vi.mocked(TodoistApi).mockReturnValueOnce({
      getProjects: vi.fn().mockRejectedValue(new TodoistRequestError('Unauthorized', 401)),
    } as never);

    process.env.TODOIST_API_TOKEN = 'bad-token';
    const status = await getApiStatus({});
    expect(status.tokenPresent).toBe(true);
    expect(status.authUsable).toBe(false);
    expect(status.authMessage).toContain('invalid or expired');
  });
});
