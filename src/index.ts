import {
  definePluginEntry,
  type OpenClawPluginConfigSchema,
} from 'openclaw/plugin-sdk/plugin-entry';
import { registerTodoistCli } from './cli.js';
import { registerTodoistTools } from './tools.js';

const todoistConfigJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    apiToken: {
      type: 'string',
      description:
        'Todoist API token. Takes priority over the TODOIST_API_TOKEN environment variable.',
    },
  },
} as const;

export const todoistConfigSchema: OpenClawPluginConfigSchema = {
  jsonSchema: todoistConfigJsonSchema,
  uiHints: {
    apiToken: {
      label: 'API Token',
      help:
        'Your Todoist API token from Settings > Integrations > Developer. Leave empty to use the TODOIST_API_TOKEN environment variable.',
      sensitive: true,
    },
  },
  validate(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        ok: false,
        errors: ['Todoist plugin config must be an object.'],
      };
    }

    const entries = value as Record<string, unknown>;
    const unexpectedKeys = Object.keys(entries).filter((key) => key !== 'apiToken');
    if (unexpectedKeys.length > 0) {
      return {
        ok: false,
        errors: [`Unexpected Todoist plugin config field: ${unexpectedKeys[0]}.`],
      };
    }

    if (
      typeof entries.apiToken !== 'undefined' &&
      typeof entries.apiToken !== 'string'
    ) {
      return {
        ok: false,
        errors: ['Todoist plugin config field `apiToken` must be a string.'],
      };
    }

    return { ok: true };
  },
};

export default definePluginEntry({
  id: 'todoist',
  name: 'Todoist',
  description: 'Todoist integration for OpenClaw via the Todoist REST API',
  configSchema: todoistConfigSchema,
  register(api) {
    registerTodoistTools(api);
    registerTodoistCli(api);
  },
});
