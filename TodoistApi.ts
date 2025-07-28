import { Config } from "./Config";
import { NewTaskPayload, TodoistTask } from "./types/todoist";

export class TodoistApi {
  private readonly baseUrl = "https://api.todoist.com/api/v1";

  private request(endpoint: string, options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions, config: Config): GoogleAppsScript.URL_Fetch.HTTPResponse {
    const defaultOptions = {
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      muteHttpExceptions: true,
    };

    const finalOptions = { ...defaultOptions, ...options, headers: {...defaultOptions.headers, ...options.headers} };
    const response = UrlFetchApp.fetch(`${this.baseUrl}${endpoint}`, finalOptions);
    const responseCode = response.getResponseCode();

    if (responseCode < 200 || responseCode >= 300) {
      const errorBody = response.getContentText();
      console.error(`Failed request to ${endpoint}. Status: ${responseCode}, Body: ${errorBody}`);
      throw new Error(`Failed request to ${endpoint}. Status: ${responseCode}`);
    }
    return response;
  }

  createTask(task: NewTaskPayload, config: Config): TodoistTask {
    const response = this.request(`/tasks`, {
      method: "post",
      payload: JSON.stringify(task),
    }, config);
    return JSON.parse(response.getContentText());
  }

  getTasks(config: Config, filter?: string): TodoistTask[] {
    let url = `/tasks`;
    if (filter) {
      url += `?filter=${encodeURIComponent(filter)}`;
    }
    const response = this.request(url, { method: "get" }, config);
    return JSON.parse(response.getContentText());
  }

  getCompletedTasks(config: Config, since?: Date, until?: Date): TodoistTask[] {
    const sinceDate = since || new Date(new Date().setDate(new Date().getDate() - 30));
    const untilDate = until || new Date();

    const url = `/tasks/completed/by_completion_date?since=${sinceDate.toISOString()}&until=${untilDate.toISOString()}`;
    const response = this.request(url, { method: "get" }, config);
    const completed = JSON.parse(response.getContentText());
    return completed.items;
  }

  updateTask(taskId: string, task: Partial<NewTaskPayload>, config: Config): void {
    this.request(`/tasks/${encodeURIComponent(taskId)}`, {
      method: "post",
      payload: JSON.stringify(task),
    }, config);
  }

  reopenTask(taskId: string, config: Config): boolean {
    const response = this.request(`/tasks/${encodeURIComponent(taskId)}/reopen`, {
      method: "post",
    }, config);
    if (response.getResponseCode() !== 204) {
      throw new Error(`Failed to reopen task ${taskId}. Expected status 204, but got ${response.getResponseCode()}. Body: ${response.getContentText()}`);
    }
    return true;
  }
}
