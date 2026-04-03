import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import {
  TdCommandError,
  getPluginApiToken,
  isTdCommandError,
  runTd,
  type TdCommandResult,
} from './todoist.js';

const todayParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    workspace: {
      type: 'string',
      description: 'Optional workspace name to pass to `td today --workspace`.',
    },
    personal: {
      type: 'boolean',
      description: 'When true, only show personal projects.',
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
      description: 'Task content with optional Todoist natural language scheduling.',
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
      description: 'Task name, id:123 style reference, or Todoist task URL.',
    },
  },
  required: ['ref'],
} as const;

const rawCommandParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    args: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
        minLength: 1,
      },
      description: 'Arguments to pass to `td`. Do not include the `td` binary itself.',
    },
  },
  required: ['args'],
} as const;

export function registerTodoistTools(api: OpenClawPluginApi): void {
  api.registerTool({
    name: 'todoist_today',
    label: 'Todoist Today',
    description: 'List Todoist tasks due today and overdue.',
    parameters: todayParameters,
    async execute(_toolCallId, params) {
      const args = ['today', '--json'];
      const workspace = readOptionalString(params, 'workspace');
      if (workspace) {
        args.push('--workspace', workspace);
      }
      if (readOptionalBoolean(params, 'personal')) {
        args.push('--personal');
      }

      return executeTdTool({
        api,
        args,
        emptyText: 'No tasks were returned for today.',
      });
    },
  });

  api.registerTool({
    name: 'todoist_inbox',
    label: 'Todoist Inbox',
    description: 'List Todoist inbox tasks.',
    parameters: noParameters,
    async execute() {
      return executeTdTool({
        api,
        args: ['inbox', '--json'],
        emptyText: 'No inbox tasks were returned.',
      });
    },
  });

  api.registerTool({
    name: 'todoist_add_task',
    label: 'Todoist Add Task',
    description: 'Add a Todoist task using td quick-add syntax.',
    parameters: addTaskParameters,
    async execute(_toolCallId, params) {
      const content = readRequiredString(params, 'content');
      return executeTdTool({
        api,
        args: ['add', content, '--json'],
        emptyText: 'Task added successfully.',
      });
    },
  });

  api.registerTool({
    name: 'todoist_complete_task',
    label: 'Todoist Complete Task',
    description: 'Complete a Todoist task by name, id, or URL.',
    parameters: completeTaskParameters,
    async execute(_toolCallId, params) {
      const ref = readRequiredString(params, 'ref');
      return executeTdTool({
        api,
        args: ['task', 'complete', ref],
        emptyText: 'Task completed successfully.',
      });
    },
  });

  api.registerTool({
    name: 'todoist_list_projects',
    label: 'Todoist List Projects',
    description: 'List Todoist projects.',
    parameters: noParameters,
    async execute() {
      return executeTdTool({
        api,
        args: ['project', 'list', '--json'],
        emptyText: 'No projects were returned.',
      });
    },
  });

  api.registerTool({
    name: 'todoist_run',
    label: 'Todoist Raw Command',
    description: 'Run a raw Todoist `td` command when a dedicated tool does not fit.',
    parameters: rawCommandParameters,
    async execute(_toolCallId, params) {
      const args = readStringArray(params, 'args');
      if (args.length === 0) {
        return failureResult(
          new TdCommandError({
            kind: 'invalid_arguments',
            command: 'td',
            message: 'Pass at least one `td` argument in `args`.',
          }),
        );
      }

      if (args[0] === 'td') {
        return failureResult(
          new TdCommandError({
            kind: 'invalid_arguments',
            command: 'td',
            message: 'Pass only the arguments after `td`, not the binary name itself.',
          }),
        );
      }

      if (args[0] === 'auth' && args[1] === 'login') {
        return failureResult(
          new TdCommandError({
            kind: 'invalid_arguments',
            command: 'td auth login',
            message:
              'Interactive `td auth login` is not supported from the tool. Run it in a terminal, or configure `plugins.entries.todoist.config.apiToken` instead.',
          }),
        );
      }

      return executeTdTool({
        api,
        args,
        emptyText: 'Todoist CLI command completed.',
      });
    },
  });
}

async function executeTdTool(params: {
  api: OpenClawPluginApi;
  args: string[];
  emptyText: string;
}) {
  try {
    const result = await runTd(params.args, {
      apiToken: getPluginApiToken(params.api.pluginConfig),
    });
    return successResult(result, params.emptyText);
  } catch (error: unknown) {
    return failureResult(error);
  }
}

function successResult(result: TdCommandResult, emptyText: string) {
  const textSections = [formatPrimaryOutput(result, emptyText)];
  if (result.stderr) {
    textSections.push(`td stderr:\n${result.stderr}`);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: textSections.join('\n\n'),
      },
    ],
    details: {
      status: 'ok',
      command: result.command,
      stderr: result.stderr || undefined,
      json: result.json,
    },
  };
}

function failureResult(error: unknown) {
  const tdError = normalizeToolError(error);
  const textSections = [tdError.message];
  if (tdError.stderr) {
    textSections.push(`td stderr:\n${tdError.stderr}`);
  } else if (tdError.kind === 'malformed_json' && tdError.stdout) {
    textSections.push(`td stdout:\n${tdError.stdout}`);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: textSections.join('\n\n'),
      },
    ],
    details: {
      status: 'failed' as const,
      kind: tdError.kind,
      command: tdError.command,
      exitCode: tdError.exitCode,
    },
  };
}

function formatPrimaryOutput(result: TdCommandResult, emptyText: string): string {
  if (typeof result.json !== 'undefined') {
    return JSON.stringify(result.json, null, 2);
  }

  return result.stdout || emptyText;
}

function normalizeToolError(error: unknown): TdCommandError {
  if (isTdCommandError(error)) {
    return error;
  }

  return new TdCommandError({
    kind: 'command_failed',
    command: 'td',
    message: 'Unexpected Todoist plugin failure.',
  });
}

function readRequiredString(params: unknown, key: string): string {
  const value = readOptionalString(params, key);
  if (!value) {
    throw new TdCommandError({
      kind: 'invalid_arguments',
      command: 'td',
      message: `Missing required parameter: ${key}.`,
    });
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

function readStringArray(params: unknown, key: string): string[] {
  if (!isRecord(params) || !Array.isArray(params[key])) {
    return [];
  }

  return params[key]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
