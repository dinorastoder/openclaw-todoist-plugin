import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import { TodoistRequestError } from '@doist/todoist-sdk';
import type {
  Task,
  Comment,
  Label,
  Section,
  PersonalProject,
  WorkspaceProject,
} from '@doist/todoist-sdk';
import { createApi, getApiErrorMessage, resolveApiToken } from './todoist.js';

type AnyResult = Task | Comment | Label | Section | PersonalProject | WorkspaceProject;

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

const taskIdParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    taskId: {
      type: 'string',
      minLength: 1,
      description: 'The Todoist task id.',
    },
  },
  required: ['taskId'],
} as const;

const getTasksParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    projectId: {
      type: 'string',
      description: 'Filter tasks by project id.',
    },
    sectionId: {
      type: 'string',
      description: 'Filter tasks by section id.',
    },
    parentId: {
      type: 'string',
      description: 'Filter tasks by parent task id (returns sub-tasks of the given task).',
    },
    label: {
      type: 'string',
      description: 'Filter tasks by label name.',
    },
  },
} as const;

const updateTaskParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    taskId: {
      type: 'string',
      minLength: 1,
      description: 'The id of the task to update.',
    },
    content: {
      type: 'string',
      description: 'New task text.',
    },
    description: {
      type: 'string',
      description: 'New task description.',
    },
    dueString: {
      type: 'string',
      description:
        'New due date in natural language (e.g. "tomorrow", "next Monday at 9am"). Use "no date" to clear.',
    },
    priority: {
      type: 'number',
      description: 'Task priority: 1 (normal) to 4 (urgent).',
    },
    labels: {
      type: 'array',
      items: { type: 'string' },
      description: 'New set of label names for the task.',
    },
    assigneeId: {
      type: 'string',
      description: 'User id to assign the task to. Pass an empty string to unassign.',
    },
    deadlineDate: {
      type: 'string',
      description: 'Deadline date in YYYY-MM-DD format. Pass an empty string to clear.',
    },
  },
  required: ['taskId'],
} as const;

const moveTaskParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    taskId: {
      type: 'string',
      minLength: 1,
      description: 'The id of the task to move.',
    },
    projectId: {
      type: 'string',
      description: 'Target project id.',
    },
    sectionId: {
      type: 'string',
      description: 'Target section id.',
    },
    parentId: {
      type: 'string',
      description: 'Target parent task id (makes the task a sub-task).',
    },
  },
  required: ['taskId'],
} as const;

const addProjectParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      description: 'Name of the new project.',
    },
    parentId: {
      type: 'string',
      description: 'Parent project id (creates a sub-project).',
    },
    color: {
      type: 'string',
      description: 'Color key for the project (e.g. "red", "blue", "green").',
    },
    isFavorite: {
      type: 'boolean',
      description: 'Whether to mark the project as a favorite.',
    },
  },
  required: ['name'],
} as const;

const updateProjectParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    projectId: {
      type: 'string',
      minLength: 1,
      description: 'The id of the project to update.',
    },
    name: {
      type: 'string',
      description: 'New project name.',
    },
    color: {
      type: 'string',
      description: 'New color key (e.g. "red", "blue", "green").',
    },
    isFavorite: {
      type: 'boolean',
      description: 'Whether to mark the project as a favorite.',
    },
  },
  required: ['projectId'],
} as const;

const projectIdParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    projectId: {
      type: 'string',
      minLength: 1,
      description: 'The Todoist project id.',
    },
  },
  required: ['projectId'],
} as const;

const listSectionsParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    projectId: {
      type: 'string',
      description: 'Filter sections by project id.',
    },
  },
} as const;

const addSectionParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      description: 'Name of the new section.',
    },
    projectId: {
      type: 'string',
      minLength: 1,
      description: 'The project id to add the section to.',
    },
  },
  required: ['name', 'projectId'],
} as const;

const updateSectionParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sectionId: {
      type: 'string',
      minLength: 1,
      description: 'The id of the section to update.',
    },
    name: {
      type: 'string',
      minLength: 1,
      description: 'New section name.',
    },
  },
  required: ['sectionId', 'name'],
} as const;

const sectionIdParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sectionId: {
      type: 'string',
      minLength: 1,
      description: 'The Todoist section id.',
    },
  },
  required: ['sectionId'],
} as const;

const addLabelParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      description: 'Name of the new label.',
    },
    color: {
      type: 'string',
      description: 'Color key for the label (e.g. "red", "blue", "green").',
    },
    isFavorite: {
      type: 'boolean',
      description: 'Whether to mark the label as a favorite.',
    },
  },
  required: ['name'],
} as const;

const updateLabelParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    labelId: {
      type: 'string',
      minLength: 1,
      description: 'The id of the label to update.',
    },
    name: {
      type: 'string',
      description: 'New label name.',
    },
    color: {
      type: 'string',
      description: 'New color key (e.g. "red", "blue", "green").',
    },
    isFavorite: {
      type: 'boolean',
      description: 'Whether to mark the label as a favorite.',
    },
  },
  required: ['labelId'],
} as const;

const labelIdParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    labelId: {
      type: 'string',
      minLength: 1,
      description: 'The Todoist label id.',
    },
  },
  required: ['labelId'],
} as const;

const getCommentsParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    taskId: {
      type: 'string',
      description: 'Task id to fetch comments for. Provide either taskId or projectId.',
    },
    projectId: {
      type: 'string',
      description: 'Project id to fetch comments for. Provide either taskId or projectId.',
    },
  },
} as const;

const addCommentParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    content: {
      type: 'string',
      minLength: 1,
      description: 'Comment text.',
    },
    taskId: {
      type: 'string',
      description: 'Task id to add the comment to. Provide either taskId or projectId.',
    },
    projectId: {
      type: 'string',
      description: 'Project id to add the comment to. Provide either taskId or projectId.',
    },
  },
  required: ['content'],
} as const;

export function registerTodoistTools(api: OpenClawPluginApi): void {
  // ── Existing core tools ───────────────────────────────────────────────────

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

  // ── Task tools ────────────────────────────────────────────────────────────

  api.registerTool({
    name: 'todoist_get_task',
    label: 'Todoist Get Task',
    description: 'Retrieve a single Todoist task by its id.',
    parameters: taskIdParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_get_task');
      const taskId = readRequiredString(params, 'taskId');
      try {
        const todoistApi = createApi(token);
        const task = await todoistApi.getTask(taskId);
        return successResult([task], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_get_task');
      }
    },
  });

  api.registerTool({
    name: 'todoist_get_tasks',
    label: 'Todoist Get Tasks',
    description: 'List Todoist tasks, optionally filtered by project, section, parent, or label.',
    parameters: getTasksParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_get_tasks');
      const projectId = readOptionalString(params, 'projectId');
      const sectionId = readOptionalString(params, 'sectionId');
      const parentId = readOptionalString(params, 'parentId');
      const label = readOptionalString(params, 'label');
      try {
        const todoistApi = createApi(token);
        const response = await todoistApi.getTasks({ projectId, sectionId, parentId, label });
        return successResult(response.results, 'No tasks were returned.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_get_tasks');
      }
    },
  });

  api.registerTool({
    name: 'todoist_update_task',
    label: 'Todoist Update Task',
    description:
      'Update a Todoist task. Provide only the fields you want to change.',
    parameters: updateTaskParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_update_task');
      const taskId = readRequiredString(params, 'taskId');
      const content = readOptionalString(params, 'content');
      const description = readOptionalString(params, 'description');
      const dueString = readOptionalString(params, 'dueString');
      const priority = readOptionalNumber(params, 'priority');
      const labels = readOptionalStringArray(params, 'labels');
      const assigneeId = readOptionalString(params, 'assigneeId');
      const deadlineDate = readOptionalString(params, 'deadlineDate');
      try {
        const todoistApi = createApi(token);
        const args: Record<string, unknown> = {};
        if (content !== undefined) args['content'] = content;
        if (description !== undefined) args['description'] = description;
        if (dueString !== undefined) args['dueString'] = dueString;
        if (priority !== undefined) args['priority'] = priority;
        if (labels !== undefined) args['labels'] = labels;
        if (assigneeId !== undefined) args['assigneeId'] = assigneeId;
        if (deadlineDate !== undefined) args['deadlineDate'] = deadlineDate;
        const task = await todoistApi.updateTask(taskId, args as Parameters<typeof todoistApi.updateTask>[1]);
        return successResult([task], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_update_task');
      }
    },
  });

  api.registerTool({
    name: 'todoist_delete_task',
    label: 'Todoist Delete Task',
    description: 'Permanently delete a Todoist task.',
    parameters: taskIdParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_delete_task');
      const taskId = readRequiredString(params, 'taskId');
      try {
        const todoistApi = createApi(token);
        await todoistApi.deleteTask(taskId);
        return successResult([], 'Task deleted successfully.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_delete_task');
      }
    },
  });

  api.registerTool({
    name: 'todoist_reopen_task',
    label: 'Todoist Reopen Task',
    description: 'Reopen (uncomplete) a previously completed Todoist task.',
    parameters: taskIdParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_reopen_task');
      const taskId = readRequiredString(params, 'taskId');
      try {
        const todoistApi = createApi(token);
        await todoistApi.reopenTask(taskId);
        return successResult([], 'Task reopened successfully.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_reopen_task');
      }
    },
  });

  api.registerTool({
    name: 'todoist_move_task',
    label: 'Todoist Move Task',
    description:
      'Move a Todoist task to a different project, section, or parent task. Provide exactly one of projectId, sectionId, or parentId.',
    parameters: moveTaskParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_move_task');
      const taskId = readRequiredString(params, 'taskId');
      const projectId = readOptionalString(params, 'projectId');
      const sectionId = readOptionalString(params, 'sectionId');
      const parentId = readOptionalString(params, 'parentId');

      if (!projectId && !sectionId && !parentId) {
        return plainErrorResult(
          'Provide exactly one of projectId, sectionId, or parentId to move the task.',
        );
      }

      try {
        const todoistApi = createApi(token);
        const dest = projectId
          ? { projectId }
          : sectionId
            ? { sectionId }
            : { parentId: parentId! };
        const task = await todoistApi.moveTask(taskId, dest);
        return successResult([task], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_move_task');
      }
    },
  });

  // ── Project tools ─────────────────────────────────────────────────────────

  api.registerTool({
    name: 'todoist_add_project',
    label: 'Todoist Add Project',
    description: 'Create a new Todoist project.',
    parameters: addProjectParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_add_project');
      const name = readRequiredString(params, 'name');
      const parentId = readOptionalString(params, 'parentId');
      const color = readOptionalString(params, 'color');
      const isFavorite = readOptionalBooleanValue(params, 'isFavorite');
      try {
        const todoistApi = createApi(token);
        const args: Record<string, unknown> = { name };
        if (parentId !== undefined) args['parentId'] = parentId;
        if (color !== undefined) args['color'] = color;
        if (isFavorite !== undefined) args['isFavorite'] = isFavorite;
        const project = await todoistApi.addProject(args as Parameters<typeof todoistApi.addProject>[0]);
        return successResult([project], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_add_project');
      }
    },
  });

  api.registerTool({
    name: 'todoist_update_project',
    label: 'Todoist Update Project',
    description: 'Update a Todoist project. Provide only the fields you want to change.',
    parameters: updateProjectParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_update_project');
      const projectId = readRequiredString(params, 'projectId');
      const name = readOptionalString(params, 'name');
      const color = readOptionalString(params, 'color');
      const isFavorite = readOptionalBooleanValue(params, 'isFavorite');
      try {
        const todoistApi = createApi(token);
        const args: Record<string, unknown> = {};
        if (name !== undefined) args['name'] = name;
        if (color !== undefined) args['color'] = color;
        if (isFavorite !== undefined) args['isFavorite'] = isFavorite;
        const project = await todoistApi.updateProject(projectId, args as Parameters<typeof todoistApi.updateProject>[1]);
        return successResult([project], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_update_project');
      }
    },
  });

  api.registerTool({
    name: 'todoist_delete_project',
    label: 'Todoist Delete Project',
    description: 'Permanently delete a Todoist project and all its tasks.',
    parameters: projectIdParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_delete_project');
      const projectId = readRequiredString(params, 'projectId');
      try {
        const todoistApi = createApi(token);
        await todoistApi.deleteProject(projectId);
        return successResult([], 'Project deleted successfully.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_delete_project');
      }
    },
  });

  // ── Section tools ─────────────────────────────────────────────────────────

  api.registerTool({
    name: 'todoist_list_sections',
    label: 'Todoist List Sections',
    description: 'List Todoist sections, optionally filtered by project.',
    parameters: listSectionsParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_list_sections');
      const projectId = readOptionalString(params, 'projectId');
      try {
        const todoistApi = createApi(token);
        const response = await todoistApi.getSections(projectId ? { projectId } : undefined);
        return successResult(response.results, 'No sections were returned.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_list_sections');
      }
    },
  });

  api.registerTool({
    name: 'todoist_add_section',
    label: 'Todoist Add Section',
    description: 'Create a new section inside a Todoist project.',
    parameters: addSectionParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_add_section');
      const name = readRequiredString(params, 'name');
      const projectId = readRequiredString(params, 'projectId');
      try {
        const todoistApi = createApi(token);
        const section = await todoistApi.addSection({ name, projectId });
        return successResult([section], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_add_section');
      }
    },
  });

  api.registerTool({
    name: 'todoist_update_section',
    label: 'Todoist Update Section',
    description: 'Rename a Todoist section.',
    parameters: updateSectionParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_update_section');
      const sectionId = readRequiredString(params, 'sectionId');
      const name = readRequiredString(params, 'name');
      try {
        const todoistApi = createApi(token);
        const section = await todoistApi.updateSection(sectionId, { name });
        return successResult([section], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_update_section');
      }
    },
  });

  api.registerTool({
    name: 'todoist_delete_section',
    label: 'Todoist Delete Section',
    description: 'Delete a Todoist section and its tasks.',
    parameters: sectionIdParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_delete_section');
      const sectionId = readRequiredString(params, 'sectionId');
      try {
        const todoistApi = createApi(token);
        await todoistApi.deleteSection(sectionId);
        return successResult([], 'Section deleted successfully.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_delete_section');
      }
    },
  });

  // ── Label tools ───────────────────────────────────────────────────────────

  api.registerTool({
    name: 'todoist_list_labels',
    label: 'Todoist List Labels',
    description: 'List all personal Todoist labels.',
    parameters: noParameters,
    async execute() {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_list_labels');
      try {
        const todoistApi = createApi(token);
        const response = await todoistApi.getLabels();
        return successResult(response.results, 'No labels were returned.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_list_labels');
      }
    },
  });

  api.registerTool({
    name: 'todoist_add_label',
    label: 'Todoist Add Label',
    description: 'Create a new personal Todoist label.',
    parameters: addLabelParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_add_label');
      const name = readRequiredString(params, 'name');
      const color = readOptionalString(params, 'color');
      const isFavorite = readOptionalBooleanValue(params, 'isFavorite');
      try {
        const todoistApi = createApi(token);
        const args: Record<string, unknown> = { name };
        if (color !== undefined) args['color'] = color;
        if (isFavorite !== undefined) args['isFavorite'] = isFavorite;
        const label = await todoistApi.addLabel(args as Parameters<typeof todoistApi.addLabel>[0]);
        return successResult([label], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_add_label');
      }
    },
  });

  api.registerTool({
    name: 'todoist_update_label',
    label: 'Todoist Update Label',
    description: 'Update a personal Todoist label. Provide only the fields you want to change.',
    parameters: updateLabelParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_update_label');
      const labelId = readRequiredString(params, 'labelId');
      const name = readOptionalString(params, 'name');
      const color = readOptionalString(params, 'color');
      const isFavorite = readOptionalBooleanValue(params, 'isFavorite');
      try {
        const todoistApi = createApi(token);
        const args: Record<string, unknown> = {};
        if (name !== undefined) args['name'] = name;
        if (color !== undefined) args['color'] = color;
        if (isFavorite !== undefined) args['isFavorite'] = isFavorite;
        const label = await todoistApi.updateLabel(labelId, args as Parameters<typeof todoistApi.updateLabel>[1]);
        return successResult([label], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_update_label');
      }
    },
  });

  api.registerTool({
    name: 'todoist_delete_label',
    label: 'Todoist Delete Label',
    description: 'Delete a personal Todoist label.',
    parameters: labelIdParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_delete_label');
      const labelId = readRequiredString(params, 'labelId');
      try {
        const todoistApi = createApi(token);
        await todoistApi.deleteLabel(labelId);
        return successResult([], 'Label deleted successfully.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_delete_label');
      }
    },
  });

  // ── Comment tools ─────────────────────────────────────────────────────────

  api.registerTool({
    name: 'todoist_get_comments',
    label: 'Todoist Get Comments',
    description:
      'Retrieve comments for a Todoist task or project. Provide either taskId or projectId.',
    parameters: getCommentsParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_get_comments');
      const taskId = readOptionalString(params, 'taskId');
      const projectId = readOptionalString(params, 'projectId');

      if (!taskId && !projectId) {
        return plainErrorResult('Provide either taskId or projectId to fetch comments.');
      }

      try {
        const todoistApi = createApi(token);
        const args = taskId ? { taskId } : { projectId: projectId! };
        const response = await todoistApi.getComments(args);
        return successResult(response.results, 'No comments were returned.');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_get_comments');
      }
    },
  });

  api.registerTool({
    name: 'todoist_add_comment',
    label: 'Todoist Add Comment',
    description:
      'Add a comment to a Todoist task or project. Provide either taskId or projectId.',
    parameters: addCommentParameters,
    async execute(_toolCallId, params) {
      const token = resolveApiToken(api.pluginConfig);
      if (!token) return authErrorResult('todoist_add_comment');
      const content = readRequiredString(params, 'content');
      const taskId = readOptionalString(params, 'taskId');
      const projectId = readOptionalString(params, 'projectId');

      if (!taskId && !projectId) {
        return plainErrorResult('Provide either taskId or projectId to add a comment.');
      }

      try {
        const todoistApi = createApi(token);
        const args = taskId
          ? { content, taskId }
          : { content, projectId: projectId! };
        const comment = await todoistApi.addComment(args);
        return successResult([comment], '');
      } catch (error: unknown) {
        return errorResult(error, 'todoist_add_comment');
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
  data: AnyResult[],
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

function readOptionalBooleanValue(params: unknown, key: string): boolean | undefined {
  if (!isRecord(params)) return undefined;
  const value = params[key];
  if (typeof value === 'boolean') return value;
  return undefined;
}

function readOptionalNumber(params: unknown, key: string): number | undefined {
  if (!isRecord(params)) return undefined;
  const value = params[key];
  return typeof value === 'number' ? value : undefined;
}

function readOptionalStringArray(params: unknown, key: string): string[] | undefined {
  if (!isRecord(params)) return undefined;
  const value = params[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
