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

// A collection of mock objects for testing.
export default class Mocks {
  static getMockSheet(data: any[][]): GoogleAppsScript.Spreadsheet.Sheet {
    return {
      getDataRange: () => ({
        getDisplayValues: () => data,
      }),
    } as any;
  }

  static getMockSpreadsheet(sheets: { [key: string]: GoogleAppsScript.Spreadsheet.Sheet }): GoogleAppsScript.Spreadsheet.Spreadsheet {
    return {
      getSheetByName: (name: string) => sheets[name] || null,
    } as any;
  }

  static getMockMessage(data: Partial<GoogleAppsScript.Gmail.GmailMessage>): GoogleAppsScript.Gmail.GmailMessage {
    return {
      getSubject: () => data.subject || '',
      getPlainBody: () => data.plainBody || '',
      ...data,
    } as any;
  }
  
  static getMockThread(data: Partial<GoogleAppsScript.Gmail.GmailThread>): GoogleAppsScript.Gmail.GmailThread {
    return {
        getId: () => data.id || '',
        getPermalink: () => data.permalink || '',
        ...data,
    } as any;
  }

  static getMockUrlFetchResponse(code: number, content: string): GoogleAppsScript.URL_Fetch.HTTPResponse {
    return {
      getResponseCode: () => code,
      getContentText: () => content,
    } as any;
  }

  static getMockTask(data: Partial<GoogleAppsScript.Tasks.Schema.Task>): GoogleAppsScript.Tasks.Schema.Task {
      return {
          id: data.id || 'task-id-' + Math.random(),
          title: data.title || 'Mock Task',
          notes: data.notes || '',
          completed: data.completed || null,
          ...data,
      }
  }

  static getMockTaskList(data: Partial<GoogleAppsScript.Tasks.Schema.TaskList>): GoogleAppsScript.Tasks.Schema.TaskList {
    return {
        id: data.id || 'task-list-id-' + Math.random(),
        title: data.title || 'Mock Task List',
        ...data,
    }
  }
}
