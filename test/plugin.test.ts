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
      'todoist_get_task',
      'todoist_get_tasks',
      'todoist_update_task',
      'todoist_delete_task',
      'todoist_reopen_task',
      'todoist_move_task',
      'todoist_add_project',
      'todoist_update_project',
      'todoist_delete_project',
      'todoist_list_sections',
      'todoist_add_section',
      'todoist_update_section',
      'todoist_delete_section',
      'todoist_list_labels',
      'todoist_add_label',
      'todoist_update_label',
      'todoist_delete_label',
      'todoist_get_comments',
      'todoist_add_comment',
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
