import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { TodoistRequestError } from '@doist/todoist-sdk';
import type { Task, PersonalProject, WorkspaceProject } from '@doist/todoist-sdk';
import { createApi, getApiErrorMessage, resolveApiToken } from './todoist.js';

const todayParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    workspace: {
      type: 'string',
      description: 'Optional workspace name to filter tasks by (uses Todoist filter syntax).',
    },
    personal: {
      type: 'boolean',
      description: 'When true, only show personal (non-workspace) tasks.',
    },
  },
} as const;

const noParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {},
} as const;

const addTaskParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    content: {
      type: 'string',
      minLength: 1,
      description:
        'Task text with optional Todoist natural language extras (e.g. "Buy groceries tomorrow #Work").',
    },
  },
  required: ['content'],
} as const;

const completeTaskParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ref: {
      type: 'string',
      minLength: 1,
      description: 'Task id (e.g. "12345678"), Todoist task URL, or task name.',
    },
  },
  required: ['ref'],
} as const;

export function registerTodoistTools(api: OpenClawPluginApi): void {
  api.registerTool({
    name: 'todoist_today',
    label: 'Todoist Today',
    description: 'List Todoist tasks due today and overdue.',
    parameters: todayParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) {
        return authErrorResult('todoist_today');
      }

      const workspace = readOptionalString(params, 'workspace');
      const personal = readOptionalBoolean(params, 'personal');

      let query = 'today | overdue';
      if (workspace) {
        query = `(today | overdue) & ##"${sanitizeFilterLiteral(workspace)}"`;
      } else if (personal) {
        query = '(today | overdue) & !##';
      }

      try {
        const todoistApi = createApi(token);
        const response = await todoistApi.getTasksByFilter({ query });
        return successResult(response.results, 'No tasks were returned for today.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_today');
      }
    },
  });

  api.registerTool({
    name: 'todoist_inbox',
    label: 'Todoist Inbox',
    description: 'List Todoist inbox tasks.',
    parameters: noParameters,
    async execute() {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) {
        return authErrorResult('todoist_inbox');
      }

      try {
        const todoistApi = createApi(token);
        const response = await todoistApi.getTasksByFilter({ query: '#Inbox' });
        return successResult(response.results, 'No inbox tasks were returned.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_inbox');
      }
    },
  });

  api.registerTool({
    name: 'todoist_add_task',
    label: 'Todoist Add Task',
    description:
      'Add a Todoist task using natural language quick-add syntax (e.g. "Buy groceries tomorrow #Work").',
    parameters: addTaskParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) {
        return authErrorResult('todoist_add_task');
      }

      const content = readRequiredString(params, 'content');
      try {
        const todoistApi = createApi(token);
        const task = await todoistApi.quickAddTask({ text: content });
        return successResult([task], 'Task added successfully.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_add_task');
      }
    },
  });

  api.registerTool({
    name: 'todoist_complete_task',
    label: 'Todoist Complete Task',
    description:
      'Complete a Todoist task by id, URL, or name. Prefer using the task id when available.',
    parameters: completeTaskParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) {
        return authErrorResult('todoist_complete_task');
      }

      const ref = readRequiredString(params, 'ref');

      try {
        const todoistApi = createApi(token);
        const taskId = resolveTaskId(ref);

        if (taskId) {
          await todoistApi.closeTask(taskId);
          return successResult([], 'Task completed successfully.');
        }

        const response = await todoistApi.getTasksByFilter({
          query: `search: ${sanitizeFilterLiteral(ref)}`,
        });
        if (response.results.length === 0) {
          return plainErrorResult(`No task found matching "${ref}".`);
        }

        const task = response.results[0]!;
        await todoistApi.closeTask(task.id);
        return successResult([], `Task "${task.content}" completed successfully.`);
      } catch (error: unknown) {
        return errorResult(error, 'todoist_complete_task');
      }
    },
  });

  api.registerTool({
    name: 'todoist_list_projects',
    label: 'Todoist List Projects',
    description: 'List Todoist projects.',
    parameters: noParameters,
    async execute() {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) {
        return authErrorResult('todoist_list_projects');
      }

      try {
        const todoistApi = createApi(token);
        const response = await todoistApi.getProjects();
        return successResult(response.results, 'No projects were returned.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_list_projects');
      }
    },
  });
}

function resolveTaskId(ref: string): string | null {
  const urlMatch = ref.match(/todoist\.com\/app\/task\/([A-Za-z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1]!;
  }
  if (/^\d+$/.test(ref.trim())) {
    return ref.trim();
  }
  return null;
}

function sanitizeFilterLiteral(value: string): string {
  return value.replace(/"/g, '');
}

function successResult(
  data: (Task | PersonalProject | WorkspaceProject)[],
  emptyText: string,
) {
  const text = data.length > 0 ? JSON.stringify(data, null, 2) : emptyText;
  return {
    content: [{ type: 'text' as const, text }],
    details: { status: 'ok' as const, data: data.length > 0 ? data : undefined },
  };
}

function errorResult(error: unknown, operation: string) {
  const message = getApiErrorMessage(error, operation);
  const statusCode =
    error instanceof TodoistRequestError ? error.httpStatusCode : undefined;
  return {
    content: [{ type: 'text' as const, text: message }],
    details: {
      status: 'failed' as const,
      operation,
      httpStatusCode: statusCode,
    },
  };
}

function plainErrorResult(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    details: { status: 'failed' as const },
  };
}

function authErrorResult(operation: string) {
  return plainErrorResult(
    `Todoist API token is not configured. Set \`plugins.entries.todoist.config.apiToken\` or \`TODOIST_API_TOKEN\`.`,
  );
}

function readRequiredString(params: unknown, key: string): string {
  const value = readOptionalString(params, key);
  if (!value) {
    throw new Error(`Missing required parameter: ${key}.`);
  }
  return value;
}

function readOptionalString(params: unknown, key: string): string | undefined {
  if (!isRecord(params)) {
    return undefined;
  }
  const value = params[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readOptionalBoolean(params: unknown, key: string): boolean {
  return isRecord(params) && params[key] === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
