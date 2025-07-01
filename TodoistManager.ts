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
  public static upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    taskDetails: NonNullable<PlanOfAction['task']>,
    config: Config
  ): boolean {
    const threadId = thread.getId();
    const permalink = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
    const content = `[${taskDetails.title}](${permalink})`;

    const taskData: any = {
      content: content,
      description: taskDetails.notes,
      due_string: 'today',
    };

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
