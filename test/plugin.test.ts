import { describe, expect, it, vi } from 'vitest';
import plugin, { todoistConfigSchema } from '../src/index.js';

describe('plugin registration', () => {
  it('registers the expected Todoist tools and CLI command', () => {
    const tools: string[] = [];
    const registerCli = vi.fn();

    plugin.register({
      registerTool(tool) {
        if (typeof tool !== 'function') {
          tools.push(tool.name);
        }
      },
      registerCli,
    } as never);

    expect(tools).toEqual([
      'todoist_today',
      'todoist_inbox',
      'todoist_add_task',
      'todoist_complete_task',
      'todoist_list_projects',
    ]);
    expect(registerCli).toHaveBeenCalledTimes(1);
    expect(registerCli.mock.calls[0]?.[1]).toEqual({ commands: ['todoist'] });
  });

  it('validates Todoist config shape', () => {
    expect(todoistConfigSchema.validate?.({})).toEqual({ ok: true });
    expect(todoistConfigSchema.validate?.({ apiToken: 'token' })).toEqual({ ok: true });
    expect(todoistConfigSchema.validate?.({ apiToken: 1 })).toEqual({
      ok: false,
      errors: ['Todoist plugin config field `apiToken` must be a string.'],
    });
    expect(todoistConfigSchema.validate?.({ unexpected: true })).toEqual({
      ok: false,
      errors: ['Unexpected Todoist plugin config field: unexpected.'],
    });
  });
});
