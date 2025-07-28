
import { Config } from "./Config";
import { Task, TasksManager } from "./TasksManager";
import { TodoistApi } from "./TodoistApi";
import { NewTaskPayload, TodoistTask } from "./types/todoist";

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
  ): boolean {
    const threadId = thread.getId();
    const existingTasks = this.findTaskByThreadId(threadId, config);

    const content = task.title;
    const description = `${task.notes}\n\n[View in Gmail](${permalink})\n\n-----\n\ngmail_thread_id: ${threadId}`;
    
    const taskPayload: NewTaskPayload = {
      content,
      description,
      due_date: task.due_date,
      priority: task.priority,
    };

    try {
      if (existingTasks.length > 0) {
        const existingTask = existingTasks[0];
        this.api.updateTask(existingTask.id, taskPayload, config);
      } else {
        taskPayload.project_id = config.todoist_project_id;
        this.api.createTask(taskPayload, config);
      }
      return true;
    } catch (e) {
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      console.error(`Todoist API error in upsertTask for thread ${threadId}. Error: ${errorMessage}`);
      return false;
    }
  }

  public findTask(threadId: string, config: Config): TodoistTask | null {
    const tasks = this.findTaskByThreadId(threadId, config);
    if (tasks.length > 0) {
      return tasks[0];
    }
    return null;
  }

  private findTaskByThreadId(threadId: string, config: Config): TodoistTask[] {
    if (!config.todoist_api_key) {
      console.warn('Todoist API key is not configured.');
      return [];
    }
    try {
      const sanitizedThreadId = threadId.replace(/"/g, ''); 
      const filter = `search: "gmail_thread_id: ${sanitizedThreadId}"`;
      const tasks = this.api.getTasks(config, filter);
      return tasks.filter((task: any) => 
        task.description && task.description.includes(`gmail_thread_id: ${sanitizedThreadId}`)
      );
    } catch (e) {
      const errorMessage = (e instanceof Error) ? e.message : String(e);
      console.error(`Exception fetching tasks from Todoist: ${errorMessage}`);
      return [];
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
      return false;
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
