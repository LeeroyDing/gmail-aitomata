
import { Config } from "./Config";
import { NewTaskPayload, TodoistTask } from "./types/todoist";

export class TodoistApi {
  private readonly baseUrl = "https://api.todoist.com/rest/v2";

  createTask(task: NewTaskPayload, config: Config): TodoistTask {
    const options = {
      method: "post" as const,
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      payload: JSON.stringify(task),
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(`${this.baseUrl}/tasks`, options);
    const responseCode = response.getResponseCode();

    if (responseCode < 200 || responseCode >= 300) {
      const errorBody = response.getContentText();
      throw new Error(`Failed to create task. Status: ${responseCode}, Body: ${errorBody}`);
    }
    return JSON.parse(response.getContentText());
  }

  getTasks(config: Config, filter?: string): TodoistTask[] {
    const options = {
      method: "get" as const,
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      muteHttpExceptions: true,
    };
    let url = `${this.baseUrl}/tasks`;
    if (filter) {
      url += `?filter=${encodeURIComponent(filter)}`;
    }
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode < 200 || responseCode >= 300) {
      const errorBody = response.getContentText();
      throw new Error(`Failed to get tasks. Status: ${responseCode}, Body: ${errorBody}`);
    }
    return JSON.parse(response.getContentText());
  }

  updateTask(taskId: string, task: Partial<NewTaskPayload>, config: Config): void {
    const options = {
      method: "post" as const,
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      payload: JSON.stringify(task),
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(`${this.baseUrl}/tasks/${taskId}`, options);
    const responseCode = response.getResponseCode();

    if (responseCode < 200 || responseCode >= 300) {
      const errorBody = response.getContentText();
      throw new Error(`Failed to update task ${taskId}. Status: ${responseCode}, Body: ${errorBody}`);
    }
  }

  reopenTask(taskId: string, config: Config): boolean {
    const options = {
      method: "post" as const,
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(`${this.baseUrl}/tasks/${taskId}/reopen`, options);
    const responseCode = response.getResponseCode();

    if (responseCode < 200 || responseCode >= 300) {
      const errorBody = response.getContentText();
      throw new Error(`Failed to reopen task ${taskId}. Status: ${responseCode}, Body: ${errorBody}`);
    }
    return response.getResponseCode() === 204;
  }
}
