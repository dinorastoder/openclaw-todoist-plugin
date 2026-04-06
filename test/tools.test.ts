import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoistRequestError } from '@doist/todoist-sdk';
import { registerTodoistTools } from '../src/tools.js';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';

// ---------------------------------------------------------------------------
// Mock the entire @doist/todoist-sdk module
// ---------------------------------------------------------------------------

vi.mock('@doist/todoist-sdk', async () => {
  const actual = await vi.importActual<typeof import('@doist/todoist-sdk')>('@doist/todoist-sdk');
  return {
    ...actual,
    TodoistApi: vi.fn().mockReturnValue(makeMockApi()),
  };
});

function makeMockApi() {
  return {
    getTasksByFilter: vi.fn().mockResolvedValue({ results: [], nextCursor: null }),
    getTask: vi.fn().mockResolvedValue({ id: 't1', content: 'Test task' }),
    getTasks: vi.fn().mockResolvedValue({ results: [{ id: 't1', content: 'Test task' }], nextCursor: null }),
    quickAddTask: vi.fn().mockResolvedValue({ id: 't2', content: 'Quick task' }),
    addTask: vi.fn().mockResolvedValue({ id: 't3', content: 'New task' }),
    updateTask: vi.fn().mockResolvedValue({ id: 't1', content: 'Updated task' }),
    moveTask: vi.fn().mockResolvedValue({ id: 't1', projectId: 'p2' }),
    closeTask: vi.fn().mockResolvedValue(true),
    reopenTask: vi.fn().mockResolvedValue(true),
    deleteTask: vi.fn().mockResolvedValue(true),
    getProjects: vi.fn().mockResolvedValue({ results: [{ id: 'p1', name: 'Inbox' }], nextCursor: null }),
    addProject: vi.fn().mockResolvedValue({ id: 'p2', name: 'New Project' }),
    updateProject: vi.fn().mockResolvedValue({ id: 'p1', name: 'Updated' }),
    deleteProject: vi.fn().mockResolvedValue(true),
    getSections: vi.fn().mockResolvedValue({ results: [{ id: 's1', name: 'Section 1' }], nextCursor: null }),
    addSection: vi.fn().mockResolvedValue({ id: 's2', name: 'New Section' }),
    updateSection: vi.fn().mockResolvedValue({ id: 's1', name: 'Renamed' }),
    deleteSection: vi.fn().mockResolvedValue(true),
    getLabels: vi.fn().mockResolvedValue({ results: [{ id: 'l1', name: 'Work' }], nextCursor: null }),
    addLabel: vi.fn().mockResolvedValue({ id: 'l2', name: 'Personal' }),
    updateLabel: vi.fn().mockResolvedValue({ id: 'l1', name: 'Renamed' }),
    deleteLabel: vi.fn().mockResolvedValue(true),
    getComments: vi.fn().mockResolvedValue({ results: [{ id: 'c1', content: 'A comment' }], nextCursor: null }),
    addComment: vi.fn().mockResolvedValue({ id: 'c2', content: 'New comment' }),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ToolHandler = (toolCallId: string, params: unknown) => Promise<ToolResult>;

interface ToolResult {
  content: { type: string; text: string }[];
  details: { status: string; [key: string]: unknown };
}

interface RegisteredTool {
  name: string;
  execute: ToolHandler;
}

function buildPluginApi(token = 'test-token'): {
  api: OpenClawPluginApi;
  tools: Map<string, RegisteredTool>;
} {
  const tools = new Map<string, RegisteredTool>();
  const api = {
    pluginConfig: { apiToken: token },
    registerTool(tool: RegisteredTool) {
      tools.set(tool.name, tool);
    },
    registerCli: vi.fn(),
  } as unknown as OpenClawPluginApi;
  return { api, tools };
}

async function callTool(
  tools: Map<string, RegisteredTool>,
  name: string,
  params: unknown,
): Promise<ToolResult> {
  const tool = tools.get(name);
  if (!tool) throw new Error(`Tool "${name}" not registered`);
  return tool.execute('call-id', params);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  process.env.TODOIST_API_TOKEN = 'test-token';
});

afterEach(() => {
  delete process.env.TODOIST_API_TOKEN;
  vi.clearAllMocks();
});

describe('todoist_get_task', () => {
  it('returns the task on success', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_get_task', { taskId: 't1' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('t1');
  });

  it('returns an error when no token is configured', async () => {
    delete process.env.TODOIST_API_TOKEN;
    const { api, tools } = buildPluginApi('');
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_get_task', { taskId: 't1' });
    expect(result.details.status).toBe('failed');
    expect(result.content[0]!.text).toContain('not configured');
  });
});

describe('todoist_get_tasks', () => {
  it('returns tasks with no filters', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_get_tasks', {});
    expect(result.details.status).toBe('ok');
  });

  it('passes projectId filter', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    await callTool(tools, 'todoist_get_tasks', { projectId: 'p1' });

    const { TodoistApi } = await import('@doist/todoist-sdk');
    const mockApi = vi.mocked(TodoistApi).mock.results[0]?.value as ReturnType<typeof makeMockApi>;
    expect(mockApi.getTasks).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1' }),
    );
  });

  it('shows empty message when no tasks returned', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);
    const { TodoistApi } = await import('@doist/todoist-sdk');
    vi.mocked(TodoistApi).mockReturnValueOnce({
      ...makeMockApi(),
      getTasks: vi.fn().mockResolvedValue({ results: [], nextCursor: null }),
    } as never);

    const { api: api2, tools: tools2 } = buildPluginApi();
    registerTodoistTools(api2);
    const result = await callTool(tools2, 'todoist_get_tasks', {});
    expect(result.content[0]!.text).toBe('No tasks were returned.');
  });
});

describe('todoist_update_task', () => {
  it('updates a task and returns it', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_update_task', {
      taskId: 't1',
      content: 'Updated task',
      priority: 4,
    });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('Updated task');
  });

  it('passes dueString to the API', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    await callTool(tools, 'todoist_update_task', { taskId: 't1', dueString: 'tomorrow' });

    const { TodoistApi } = await import('@doist/todoist-sdk');
    const mockApi = vi.mocked(TodoistApi).mock.results[0]?.value as ReturnType<typeof makeMockApi>;
    expect(mockApi.updateTask).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ dueString: 'tomorrow' }),
    );
  });

  it('clears dueString when passed "no date"', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    await callTool(tools, 'todoist_update_task', { taskId: 't1', dueString: 'no date' });

    const { TodoistApi } = await import('@doist/todoist-sdk');
    const mockApi = vi.mocked(TodoistApi).mock.results[0]?.value as ReturnType<typeof makeMockApi>;
    expect(mockApi.updateTask).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ dueString: 'no date' }),
    );
  });
});

describe('todoist_delete_task', () => {
  it('deletes a task and returns success', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_delete_task', { taskId: 't1' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('deleted');
  });
});

describe('todoist_reopen_task', () => {
  it('reopens a task and returns success', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_reopen_task', { taskId: 't1' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('reopened');
  });
});

describe('todoist_move_task', () => {
  it('moves task to a project', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_move_task', {
      taskId: 't1',
      projectId: 'p2',
    });
    expect(result.details.status).toBe('ok');
  });

  it('returns error when no destination is provided', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_move_task', { taskId: 't1' });
    expect(result.details.status).toBe('failed');
    expect(result.content[0]!.text).toContain('exactly one');
  });
});

describe('todoist_add_project', () => {
  it('creates a project', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_add_project', { name: 'New Project' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('New Project');
  });
});

describe('todoist_update_project', () => {
  it('updates a project', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_update_project', {
      projectId: 'p1',
      name: 'Updated',
    });
    expect(result.details.status).toBe('ok');
  });
});

describe('todoist_delete_project', () => {
  it('deletes a project', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_delete_project', { projectId: 'p1' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('deleted');
  });
});

describe('todoist_list_sections', () => {
  it('lists sections', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_list_sections', {});
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('Section 1');
  });

  it('passes projectId when provided', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    await callTool(tools, 'todoist_list_sections', { projectId: 'p1' });

    const { TodoistApi } = await import('@doist/todoist-sdk');
    const mockApi = vi.mocked(TodoistApi).mock.results[0]?.value as ReturnType<typeof makeMockApi>;
    expect(mockApi.getSections).toHaveBeenCalledWith({ projectId: 'p1' });
  });
});

describe('todoist_add_section', () => {
  it('creates a section', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_add_section', {
      name: 'New Section',
      projectId: 'p1',
    });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('New Section');
  });
});

describe('todoist_update_section', () => {
  it('renames a section', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_update_section', {
      sectionId: 's1',
      name: 'Renamed',
    });
    expect(result.details.status).toBe('ok');
  });
});

describe('todoist_delete_section', () => {
  it('deletes a section', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_delete_section', { sectionId: 's1' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('deleted');
  });
});

describe('todoist_list_labels', () => {
  it('lists labels', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_list_labels', {});
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('Work');
  });
});

describe('todoist_add_label', () => {
  it('creates a label', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_add_label', { name: 'Personal' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('Personal');
  });
});

describe('todoist_update_label', () => {
  it('updates a label', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_update_label', {
      labelId: 'l1',
      name: 'Renamed',
    });
    expect(result.details.status).toBe('ok');
  });
});

describe('todoist_delete_label', () => {
  it('deletes a label', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_delete_label', { labelId: 'l1' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('deleted');
  });
});

describe('todoist_get_comments', () => {
  it('returns comments for a task', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_get_comments', { taskId: 't1' });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('A comment');
  });

  it('returns comments for a project', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_get_comments', { projectId: 'p1' });
    expect(result.details.status).toBe('ok');
  });

  it('returns error when neither taskId nor projectId is provided', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_get_comments', {});
    expect(result.details.status).toBe('failed');
    expect(result.content[0]!.text).toContain('taskId or projectId');
  });
});

describe('todoist_add_comment', () => {
  it('adds a comment to a task', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_add_comment', {
      content: 'New comment',
      taskId: 't1',
    });
    expect(result.details.status).toBe('ok');
    expect(result.content[0]!.text).toContain('New comment');
  });

  it('returns error when neither taskId nor projectId is provided', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);

    const result = await callTool(tools, 'todoist_add_comment', { content: 'Comment' });
    expect(result.details.status).toBe('failed');
    expect(result.content[0]!.text).toContain('taskId or projectId');
  });
});

describe('error handling', () => {
  it('returns auth error message on TodoistRequestError 401', async () => {
    const { api, tools } = buildPluginApi();
    registerTodoistTools(api);
    const { TodoistApi } = await import('@doist/todoist-sdk');
    vi.mocked(TodoistApi).mockReturnValueOnce({
      ...makeMockApi(),
      getTask: vi.fn().mockRejectedValue(new TodoistRequestError('Unauthorized', 401)),
    } as never);

    const { api: api2, tools: tools2 } = buildPluginApi();
    registerTodoistTools(api2);
    const result = await callTool(tools2, 'todoist_get_task', { taskId: 'bad' });
    expect(result.details.status).toBe('failed');
    expect(result.content[0]!.text).toContain('authentication failed');
  });
});
