import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { registerTodoistCli } from './cli.js';
import { registerTodoistTools } from './tools.js';

export const todoistConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    apiToken: {
      type: 'string',
      description:
        "Todoist API token. Takes priority over the TODOIST_API_TOKEN environment variable and the token stored by 'td auth login'.",
    },
  },
} as const;

export default definePluginEntry({
  id: 'todoist',
  name: 'Todoist',
  description: 'Todoist integration for OpenClaw via the td CLI',
  configSchema: todoistConfigSchema,
  register(api) {
    registerTodoistTools(api);
    registerTodoistCli(api);
  },
});
