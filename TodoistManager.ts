import { Config } from "./Config";
import { Task, TasksManager } from "./TasksManager";

export class TodoistManager implements TasksManager {
  public upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    task: Task,
    config: Config,
    permalink: string
  ): boolean {
    const threadId = thread.getId();
    const existingTasks = this.findTaskByThreadId(threadId, config);

    const content = task.title;
    const description = task.notes;
    const priority = task.priority;

    if (existingTasks.length > 0) {
      // Update existing task
      const existingTask = existingTasks[0];
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
          description: `${description}\n\n[View in Gmail](${permalink})\n\n-----\n\ngmail_thread_id: ${threadId}`,
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

  public findTask(threadId: string, config: Config): any | null {
    const tasks = this.findTaskByThreadId(threadId, config);
    if (tasks.length > 0) {
      return tasks[0];
    }
    return null;
  }

  private findTaskByThreadId(threadId: string, config: Config): any[] {
    if (!config.todoist_api_key) {
      Logger.log('Todoist API key is not configured.');
      return [];
    }
    const url = `https://api.todoist.com/api/v1/tasks`;
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "get",
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      muteHttpExceptions: true,
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        const tasks = JSON.parse(response.getContentText());
        return tasks.filter((task: any) => 
          task.description && task.description.includes(`gmail_thread_id: ${threadId}`)
        );
      } else {
        Logger.log(`Failed to fetch tasks from Todoist: ${response.getContentText()}`);
        return [];
      }
    } catch (e) {
      Logger.log(`Exception fetching tasks from Todoist: ${e}`);
      return [];
    }
  }


  public reopenTask(taskId: string): boolean {
    const config = Config.getConfig();
    if (!config.todoist_api_key) {
      Logger.log('Todoist API key is not configured.');
      return false;
    }
    const url = `https://api.todoist.com/api/v1/tasks/${taskId}/reopen`;
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() >= 400) {
      Logger.log(`Todoist API error: ${response.getContentText()}`);
      return false;
    }
    return true;
  }

  /**
   * Finds the latest task activity timestamp for a given thread.
   *
   * This method queries the Todoist Sync API for all tasks (active and
   * completed) associated with the provided thread ID. It then identifies the
   * task with the most recent 'updated_at' timestamp, which serves as a
   * checkpoint for processing new messages in the thread.
   *
   * @param threadId The ID of the Gmail thread to check.
   * @param config The configuration object.
   * @returns The 'updated_at' timestamp of the latest task as an ISO 8601 string, or null if no tasks are found.
   */

  public findCheckpoint(threadId: string, config: Config): string | null {
    const allTasks = this.findTaskByThreadId(threadId, config);

    if (allTasks.length === 0) {
      return null;
    }

    // Find the task with the most recent 'updated' timestamp
    const latestTask = allTasks.reduce((latest, current) => {
      return new Date(latest.updated_at) > new Date(current.updated_at) ? latest : current;
    });

    return latestTask.updated_at ?? null;
  }
}
