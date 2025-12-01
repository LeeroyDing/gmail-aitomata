
import { Config } from "./Config";
import { Task, TasksManager, TaskDetails } from "./TasksManager";
import { TodoistApi } from "./TodoistApi";
import { NewTaskPayload, TodoistTask } from "./types/todoist";

const GMAIL_THREAD_ID_MARKER = "gmail_thread_id: ";

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class TodoistManager implements TasksManager {
  private api: TodoistApi;

  constructor(api: TodoistApi = new TodoistApi()) {
    this.api = api;
  }

  public upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    task: Task,
    config: Config,
    permalink: string
  ): string | null {
    const threadId = thread.getId();
    const existingTasks = this.findTaskByThreadId(threadId, config);

    const content = escapeHtml(task.title);
    const description = `${escapeHtml(task.notes)}

[View in Gmail](${permalink})

-----\n\n${GMAIL_THREAD_ID_MARKER}${threadId}`;

    const taskPayload: NewTaskPayload = {
      content,
      description,
      due_date: task.due_date,
      priority: task.priority,
    };

    try {
      if (existingTasks.length > 0) {
        if (existingTasks.length > 1) {
          console.warn(`Found ${existingTasks.length} tasks for thread ${threadId}. Updating only the first one: ${existingTasks[0].id}`);
        }
        const existingTask = existingTasks[0];
        this.api.updateTask(existingTask.id, taskPayload, config);
        return existingTask.id;
      } else {
        taskPayload.project_id = config.todoist_project_id;
        const created = this.api.createTask(taskPayload, config);
        return created.id;
      }
    } catch (e) {
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      console.error(`Todoist API error in upsertTask for thread ${threadId}. Error: ${errorMessage}`);
      throw e;
    }
  }

  public findTask(threadId: string, config: Config): TaskDetails | null {
    const tasks = this.findTaskByThreadId(threadId, config);
    if (tasks.length > 0) {
      return this.normalizeTask(tasks[0], 'needsAction');
    }
    return null;
  }

  public findCompletedTask(threadId: string, config: Config): TaskDetails | null {
    const tasks = this.getCompletedTasks(config);
    const sanitizedThreadId = threadId.replace(/"/g, '');
    const marker = `${GMAIL_THREAD_ID_MARKER}${sanitizedThreadId}`;

    // Todoist getCompletedTasks returns all completed tasks (limit might apply).
    // We filter locally.
    const found = tasks.find(t => t.content.includes(marker) || t.description?.includes(marker));
    return found ? this.normalizeTask(found, 'completed') : null;
  }

  private normalizeTask(task: TodoistTask, status: 'needsAction' | 'completed'): TaskDetails {
    return {
      id: task.id,
      title: task.content,
      notes: task.description || '',
      due_date: task.due ? task.due.date : undefined,
      priority: task.priority ? String(task.priority) : undefined,
      status: status
    };
  }

  private findTaskByThreadId(threadId: string, config: Config): TodoistTask[] {
    if (!config.todoist_api_key) {
      console.warn('Todoist API key is not configured.');
      return [];
    }
    try {
      const sanitizedThreadId = threadId.replace(/"/g, '');
      const filter = `search: "${GMAIL_THREAD_ID_MARKER}${sanitizedThreadId}"`;
      const tasks = this.api.getTasks(config, filter);
      return tasks;
    } catch (e) {
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      console.error(`Exception fetching tasks from Todoist: ${errorMessage}`);
      throw e;
    }
  }

  public reopenTask(taskId: string, config: Config): boolean {
    if (!config.todoist_api_key) {
      console.warn('Todoist API key is not configured.');
      return false;
    }
    try {
      return this.api.reopenTask(taskId, config);
    } catch (e) {
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      console.error(`Todoist API error in reopenTask for task ${taskId}. Error: ${errorMessage}`);
      throw e;
    }
  }

  public getCompletedTasks(config: Config): TodoistTask[] {
    if (!config.todoist_api_key) {
      console.warn('Todoist API key is not configured.');
      return [];
    }
    try {
      return this.api.getCompletedTasks(config);
    } catch (e) {
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      console.error(`Exception fetching completed tasks from Todoist: ${errorMessage}`);
      return [];
    }
  }

  public findCheckpoint(threadId: string, config: Config): string | null {
    const allTasks = this.findTaskByThreadId(threadId, config);

    if (allTasks.length === 0) {
      return null;
    }

    const latestTask = allTasks.reduce((latest, current) => {
      return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
    });

    return latestTask.updated_at ?? null;
  }
}
