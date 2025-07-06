/* eslint-disable @typescript-eslint/no-explicit-any */
import { Config } from './Config';
import { Task, TasksManager } from './TasksManager';
import { PlanOfAction } from './AIAnalyzer';

export class TodoistManager implements TasksManager {
  public upsertTask(thread: GoogleAppsScript.Gmail.GmailThread, task: Task, config: Config): boolean {
    const threadId = thread.getId();
    const existingTask = this.findTaskByThreadId(threadId, config);

    const permalink = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
    const subject = thread.getFirstMessageSubject();
    const description = `${task.notes}\n\n---\n\nOriginal email: [${subject}](${permalink})`;

    const taskData: {
      content: string;
      description: string;
      due_date?: string;
      priority?: number;
      project_id?: string;
    } = {
      content: task.title,
      description,
    };

    if (task.due_date && /^\d{4}-\d{2}-\d{2}$/.test(task.due_date)) {
      taskData.due_date = task.due_date;
    }

    if (task.priority) {
      // Map AI priority (1-4) to Todoist API priority (4-1)
      taskData.priority = 5 - task.priority;
    }

    if (config.todoist_project_id) {
      taskData.project_id = config.todoist_project_id;
    }

    if (existingTask) {
      // Update existing task
      const url = `https://api.todoist.com/rest/v2/tasks/${existingTask.id}`;
      const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: 'post',
        headers: {
          Authorization: `Bearer ${config.todoist_api_key}`,
        },
        contentType: 'application/json',
        payload: JSON.stringify(taskData),
        muteHttpExceptions: true,
      };
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() >= 400) {
        Logger.log(`Todoist API error: ${response.getContentText()}`);
        return false;
      }
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
          ...taskData,
          description: `${description}\ngmail_thread_id: ${threadId}`,
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