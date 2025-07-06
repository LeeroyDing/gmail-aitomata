import { Config } from "./Config";
import { Task, TasksManager } from "./TasksManager";

export class TodoistManager implements TasksManager {
  public upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    task: Task,
    config: Config
  ): boolean {
    const threadId = thread.getId();
    const existingTask = this.findTaskByThreadId(threadId, config);

    const content = task.title;
    const description = task.notes;
    const priority = task.priority;

    if (existingTask) {
      // Update existing task
      const url = `https://api.todoist.com/api/v1/tasks/${existingTask.id}`;
      const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: "post",
        headers: {
          Authorization: `Bearer ${config.todoist_api_key}`,
        },
        contentType: "application/json",
        payload: JSON.stringify({
          content,
          description: `${description}\ngmail_thread_id: ${threadId}`,
          due_date: task.due_date,
          priority,
        }),
        muteHttpExceptions: true,
      };
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() >= 400) {
        Logger.log(`Todoist API error: ${response.getContentText()}`);
        return false;
      }
    } else {
      // Create new task
      const url = "https://api.todoist.com/api/v1/tasks";
      const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: "post",
        headers: {
          Authorization: `Bearer ${config.todoist_api_key}`,
        },
        contentType: "application/json",
        payload: JSON.stringify({
          content,
          description: `${description}\ngmail_thread_id: ${threadId}`,
          project_id: config.todoist_project_id,
          due_date: task.due_date,
          priority,
        }),
        muteHttpExceptions: true,
      };
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() >= 400) {
        Logger.log(`Todoist API error: ${response.getContentText()}`);
        return false;
      }
    }
    return true;
  }

  private findTaskByThreadId(threadId: string, config: Config): any | null {
    const url = `https://api.todoist.com/api/v1/tasks?project_id=${config.todoist_project_id}`;
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
    };
    const response = UrlFetchApp.fetch(url, options);
    interface TodoistTasksResponse {
      results: Array<{
        description: string;
      }>
    }
    const tasks = JSON.parse(response.getContentText()) as TodoistTasksResponse;
    for (const task of tasks.results) {
      if (
        task.description &&
        task.description.includes(`gmail_thread_id: ${threadId}`)
      ) {
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
