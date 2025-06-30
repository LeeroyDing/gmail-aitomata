/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Config } from './Config';
import { PlanOfAction } from './AIAnalyzer';
import { TasksManager } from './TasksManager';

export class TodoistManager implements TasksManager {
  public upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    taskDetails: NonNullable<PlanOfAction['task']>,
    config: Config
  ): void {
    const threadId = thread.getId();
    const permalink = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
    const description = `${taskDetails.notes}\n\nLink to Email:\n${permalink}\n\n---\nmanaged_by: gmail-automata\ngmail_thread_id: ${threadId}`;

    const payload: {
      content: string;
      description: string;
      project_id?: string;
      due_string?: string;
    } = {
      content: taskDetails.title,
      description: description,
      due_string: taskDetails.due_date,
    };

    if (config.todoist_project_id) {
      payload.project_id = config.todoist_project_id;
    }

    const requestOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
        'X-Request-Id': Utilities.getUuid(),
      },
      payload: JSON.stringify(payload),
    };

    try {
      const existingTask = this.findTaskByThreadId(threadId, config);
      if (existingTask) {
        // Update existing task
        UrlFetchApp.fetch(`https://api.todoist.com/rest/v2/tasks/${existingTask.id}`, requestOptions);
      } else {
        // Create new task
        UrlFetchApp.fetch('https://api.todoist.com/rest/v2/tasks', requestOptions);
      }
    } catch (e) {
      console.error(`Failed to upsert Todoist task for thread ${threadId}: ${e}`);
      Logger.log(`Failed to upsert Todoist task for thread ${threadId}: ${e}`);
    }
  }

  public findCheckpoint(threadId: string, config: Config): string | null {
    const task = this.findTaskByThreadId(threadId, config);
    if (task && task.is_completed) {
      return task.completed_at;
    }
    return null;
  }

  private findTaskByThreadId(threadId: string, config: Config): any | null {
    const requestOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'get',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
    };

    try {
      const response = UrlFetchApp.fetch(`https://api.todoist.com/rest/v2/tasks?filter=search%3A%20gmail_thread_id%3A%20${threadId}`, requestOptions);
      const tasks = JSON.parse(response.getContentText());
      return tasks.length > 0 ? tasks[0] : null;
    } catch (e) {
      console.error(`Failed to find Todoist task for thread ${threadId}: ${e}`);
      Logger.log(`Failed to find Todoist task for thread ${threadId}: ${e}`);
      return null;
    }
  }
}