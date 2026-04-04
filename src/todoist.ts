import { TodoistApi, TodoistRequestError } from '@doist/todoist-sdk';

export type { Task, PersonalProject, WorkspaceProject } from '@doist/todoist-sdk';

export type ApiStatus = {
  tokenPresent: boolean;
  tokenSource: 'plugin-config' | 'environment' | 'missing';
  authUsable: boolean;
  authMessage: string;
};

export function getPluginApiToken(pluginConfig?: Record<string, unknown>): string | undefined {
  const token = pluginConfig?.['apiToken'];
  return typeof token === 'string' && token.trim() ? token.trim() : undefined;
}

export function resolveApiToken(pluginConfig?: Record<string, unknown>): string | undefined {
  const configToken = getPluginApiToken(pluginConfig);
  if (configToken) {
    return configToken;
  }
  const envToken = process.env.TODOIST_API_TOKEN;
  return typeof envToken === 'string' && envToken.trim() ? envToken.trim() : undefined;
}

export function createApi(token: string): TodoistApi {
  return new TodoistApi(token);
}

export function isTodoistRequestError(error: unknown): error is TodoistRequestError {
  return error instanceof TodoistRequestError;
}

export function getApiErrorMessage(error: unknown, operation: string): string {
  if (error instanceof TodoistRequestError) {
    if (error.isAuthenticationError()) {
      return `Todoist API authentication failed. Set \`plugins.entries.todoist.config.apiToken\` or \`TODOIST_API_TOKEN\`.`;
    }
    return `Todoist API request failed for "${operation}": ${error.message}`;
  }
  return `Unexpected Todoist plugin failure for "${operation}".`;
}

export async function getApiStatus(options: {
  pluginConfigToken?: string;
}): Promise<ApiStatus> {
  const pluginConfigTokenPresent = Boolean(options.pluginConfigToken?.trim());
  const envTokenPresent = Boolean(process.env.TODOIST_API_TOKEN?.trim());

  const token = options.pluginConfigToken?.trim() ?? process.env.TODOIST_API_TOKEN?.trim();
  const tokenSource: ApiStatus['tokenSource'] = pluginConfigTokenPresent
    ? 'plugin-config'
    : envTokenPresent
      ? 'environment'
      : 'missing';

  if (!token) {
    return {
      tokenPresent: false,
      tokenSource: 'missing',
      authUsable: false,
      authMessage:
        'No Todoist API token found. Set `plugins.entries.todoist.config.apiToken` or `TODOIST_API_TOKEN`.',
    };
  }

  try {
    const api = createApi(token);
    await api.getProjects({ limit: 1 });
    return {
      tokenPresent: true,
      tokenSource,
      authUsable: true,
      authMessage: `API token is valid (source: ${tokenSource}).`,
    };
  } catch (error: unknown) {
    if (isTodoistRequestError(error) && error.isAuthenticationError()) {
      return {
        tokenPresent: true,
        tokenSource,
        authUsable: false,
        authMessage: 'API token is invalid or expired.',
      };
    }
    return {
      tokenPresent: true,
      tokenSource,
      authUsable: false,
      authMessage: `Unable to verify Todoist API token: ${error instanceof Error ? error.message : 'unknown error'}.`,
    };
  }
}
