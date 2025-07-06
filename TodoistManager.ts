
import { Config } from './Config';
import { Task, TasksManager } from './TasksManager';

export class TodoistManager implements TasksManager {
  public upsertTask(thread: GoogleAppsScript.Gmail.GmailThread, task: Task, config: Config): boolean {
    const threadId = thread.getId();
    const existingTask = this.findTaskByThreadId(threadId, config);

    const content = `${task.title}\n${task.notes}`;
    const due = task.due_date ? { string: task.due_date } : undefined;
    const priority = task.priority;

    if (existingTask) {
      // Update existing task
      const url = `https://api.todoist.com/rest/v2/tasks/${existingTask.id}`;
      const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: 'post',
        headers: {
          Authorization: `Bearer ${config.todoist_api_key}`,
        },
        contentType: 'application/json',
        payload: JSON.stringify({ content, due_date: due, priority }),
      };
      UrlFetchApp.fetch(url, options);
    } else {
      // Create new task
      const url = 'https://api.todoist.com/rest/v2/tasks';
      const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: 'post',
        headers: {
          Authorization: `Bearer ${config.todoist_api_key}`,
        },
        contentType: 'application/json',
        payload: JSON.stringify({
          content,
          project_id: config.todoist_project_id,
          due_date: due,
          priority,
          description: `gmail_thread_id: ${threadId}`,
        }),
      };
      UrlFetchApp.fetch(url, options);
    }
    return true;
  }

  private findTaskByThreadId(threadId: string, config: Config): any | null {
    const url = `https://api.todoist.com/rest/v2/tasks?project_id=${config.todoist_project_id}`;
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
    };
    const response = UrlFetchApp.fetch(url, options);
    const tasks = JSON.parse(response.getContentText());
    for (const task of tasks) {
      if (task.description && task.description.includes(`gmail_thread_id: ${threadId}`)) {
        return task;
      }
    }
    return null;
  }

  public findCheckpoint(threadId: string, config: Config): string | null {
    // Implementation for Todoist
    return null;
  }
}
