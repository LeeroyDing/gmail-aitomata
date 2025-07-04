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

export class TodoistManager {
  public static findCheckpoint(threadId: string, config: Config): string | null {
    const thread = GmailApp.getThreadById(threadId);
    if (!thread) {
      return null;
    }
    const subject = thread.getFirstMessageSubject();
    const requestOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'get',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      muteHttpExceptions: true,
    };

    try {
      const response = UrlFetchApp.fetch('https://api.todoist.com/api/v1/activities', requestOptions);
      const responseCode = response.getResponseCode();
      const responseBody = response.getContentText();

      if (responseCode === 200) {
        const jsonResponse = JSON.parse(responseBody);
        if (jsonResponse && jsonResponse.length > 0) {
          for (const event of jsonResponse) {
            if (event.event_type === 'completed' && event.extra_data && event.extra_data.content === subject) {
              return event.event_date;
            }
          }
        }
      } else {
        console.error(`Failed to get activity from Todoist. Response code: ${responseCode}, body: ${responseBody}`);
        Logger.log(`Failed to get activity from Todoist. Response code: ${responseCode}, body: ${responseBody}`);
      }
    } catch (e) {
      console.error(`Failed to call Todoist API: ${e}`);
      Logger.log(`Failed to call Todoist API: ${e}`);
    }

    return null;
  }

  public static upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    taskDetails: NonNullable<PlanOfAction['task']>,
    config: Config
  ): boolean {
    const threadId = thread.getId();
    const permalink = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
    const subject = thread.getFirstMessageSubject();
    const description = `${taskDetails.notes}

---

Original email: [${subject}](${permalink})`;

    const taskData: any = {
      content: taskDetails.title,
      description: description,
    };

    if (taskDetails.due_date && /^\d{4}-\d{2}-\d{2}$/.test(taskDetails.due_date)) {
      taskData.due_date = taskDetails.due_date;
    }

    if (taskDetails.priority) {
        // Map AI priority (1-4) to Todoist API priority (4-1)
        taskData.priority = 5 - taskDetails.priority;
    }

    if (config.todoist_project_id) {
      taskData.project_id = config.todoist_project_id;
    }

    const requestOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${config.todoist_api_key}`,
      },
      payload: JSON.stringify(taskData),
      muteHttpExceptions: true,
    };

    try {
      const response = UrlFetchApp.fetch('https://api.todoist.com/api/v1/tasks', requestOptions);
      const responseCode = response.getResponseCode();
      const responseBody = response.getContentText();

      if (responseCode === 200) {
        console.log('Task created successfully in Todoist.');
        return true;
      } else {
        console.error(`Failed to create task in Todoist. Response code: ${responseCode}, body: ${responseBody}`);
        Logger.log(`Failed to create task in Todoist. Response code: ${responseCode}, body: ${responseBody}`);
        return false;
      }
    } catch (e) {
      console.error(`Failed to call Todoist API: ${e}`);
      Logger.log(`Failed to call Todoist API: ${e}`);
      return false;
    }
  }
}
