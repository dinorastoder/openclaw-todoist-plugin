import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readJson(path: string) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('package and manifest metadata', () => {
  it('keeps the published package and manifest aligned', () => {
    const pkg = readJson('../package.json');
    const manifest = readJson('../openclaw.plugin.json');

    expect(pkg.name).toBe('openclaw-todoist-plugin');
    expect(pkg.main).toBe('dist/index.js');
    expect(pkg.types).toBe('dist/index.d.ts');
    expect(pkg.files).toEqual(
      expect.arrayContaining(['dist/', 'openclaw.plugin.json', 'skills/', 'README.md']),
    );

    expect(manifest.id).toBe('todoist');
    expect(manifest.name).toBe('openclaw-todoist-plugin');
    expect(manifest.version).toBe(pkg.version);
    expect(manifest.skills).toEqual(['./skills']);
    expect(manifest.contracts).toEqual({
      tools: [
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
      ],
    });

    expect(pkg.openclaw).toEqual({
      type: 'extension',
      extensions: ['./dist/index.js'],
      install: {
        npmSpec: 'openclaw-todoist-plugin',
      },
    });
  });
});
