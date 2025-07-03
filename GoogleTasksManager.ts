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

type Task = GoogleAppsScript.Tasks.Schema.Task;

export class GoogleTasksManager {
  private static taskListIdCache: string | null = null;

  private static getTaskListId(config: Config): string {
    if (typeof Tasks === 'undefined' || !Tasks.Tasklists || !Tasks.Tasks) {
      throw new Error("The Google Tasks API advanced service is not enabled or is not working correctly. Please enable it in the Apps Script editor under 'Services +'.");
    }

    if (this.taskListIdCache) {
      return this.taskListIdCache;
    }

    const taskListName = config.default_task_list_name;
    if (taskListName === '@default') {
        this.taskListIdCache = '@default';
        return this.taskListIdCache;
    }

    try {
      const taskLists = Tasks.Tasklists.list();
      if (taskLists && taskLists.items) {
        for (const taskList of taskLists.items) {
          if (taskList.title === taskListName && taskList.id) {
            this.taskListIdCache = taskList.id;
            return this.taskListIdCache;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to list task lists: ${e}`);
      Logger.log(`Failed to list task lists: ${e}`);
      throw new Error(`Could not list Google Task lists. Please ensure the API is enabled.`);
    }

    throw new Error(`Task list with name '${taskListName}' not found.`);
  }

  public static findCheckpoint(threadId: string, config: Config): string | null {
    if (!Tasks || !Tasks.Tasks) {
      return null;
    }
    
    // 1. Find active task and get its update time
    const activeTask = this.findActiveTaskByThreadId(threadId, config);
    const activeTaskCheckpoint = activeTask ? activeTask.updated : null;

    // 2. Find latest completed task checkpoint
    const taskListId = this.getTaskListId(config);
    let completedCheckpoint: string | null = null;
    let pageToken: string | undefined = undefined;

    try {
      do {
        const response: GoogleAppsScript.Tasks.Schema.Tasks = Tasks.Tasks.list(taskListId, {
          showCompleted: true,
          pageToken: pageToken,
        });

        if (response && response.items) {
          for (const task of response.items) {
            if (task.notes && task.notes.includes(`gmail_thread_id: ${threadId}`) && task.completed) {
              if (!completedCheckpoint || new Date(task.completed) > new Date(completedCheckpoint)) {
                completedCheckpoint = task.completed;
              }
            }
          }
        }
        pageToken = response?.nextPageToken;
      } while (pageToken);
    } catch (e) {
      console.error(`Failed to list completed tasks: ${e}`);
      Logger.log(`Failed to list completed tasks: ${e}`);
      // Continue with what we have
    }

    // 3. Determine the most recent checkpoint
    let finalCheckpoint: string | null = null;
    if (completedCheckpoint && activeTaskCheckpoint) {
        finalCheckpoint = new Date(completedCheckpoint) > new Date(activeTaskCheckpoint) ? completedCheckpoint : activeTaskCheckpoint;
    } else {
        finalCheckpoint = completedCheckpoint || activeTaskCheckpoint;
    }
    
    console.log(`Found checkpoint for thread ${threadId}: ${finalCheckpoint}`);
    return finalCheckpoint;
  }

  public static upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    taskDetails: NonNullable<PlanOfAction['task']>,
    config: Config
  ): boolean {
    if (!Tasks || !Tasks.Tasks) {
      return false;
    }
    const threadId = thread.getId();
    const taskListId = this.getTaskListId(config);

    const existingTask = this.findActiveTaskByThreadId(threadId, config);

    const taskData: Task = {
      title: taskDetails.title,
      notes: this.formatTaskNotes(taskDetails.notes, threadId),
      due: taskDetails.due_date ? `${taskDetails.due_date}T00:00:00.000Z` : undefined,
    };

    try {
      if (existingTask && existingTask.id) {
        // Update existing task
        console.log(`Updating existing task ${existingTask.id}`);
        Tasks.Tasks.patch(taskData, taskListId, existingTask.id);
      } else {
        // Create new task
        console.log(`Creating new task`);
        Tasks.Tasks.insert(taskData, taskListId);
      }
      return true;
    } catch (e) {
      console.error(`Failed to upsert task for thread ${threadId}: ${e}`);
      Logger.log(`Failed to upsert task for thread ${threadId}: ${e}`);
      return false;
    }
  }

  private static findActiveTaskByThreadId(threadId: string, config: Config): Task | null {
    if (!Tasks || !Tasks.Tasks) {
        return null;
    }
    const taskListId = this.getTaskListId(config);
    let pageToken: string | undefined = undefined;

    try {
      do {
        const response: GoogleAppsScript.Tasks.Schema.Tasks = Tasks.Tasks.list(taskListId, {
          showCompleted: false, // Only search active tasks
          pageToken: pageToken,
        });

        if (response && response.items) {
          for (const task of response.items) {
            if (task.notes && task.notes.includes(`gmail_thread_id: ${threadId}`)) {
              return task; // Return the first active task found
            }
          }
        }
        pageToken = response?.nextPageToken;
      } while (pageToken);
    } catch (e) {
      console.error(`Failed to list active tasks: ${e}`);
      Logger.log(`Failed to list active tasks: ${e}`);
    }

    return null;
  }

  private static formatTaskNotes(
    aiSummary: string,
    threadId: string
  ): string {
    const permalink = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
    return `${aiSummary}\n\nLink to Email:\n${permalink}\n\n---\nmanaged_by: gmail-automata\ngmail_thread_id: ${threadId}`;
  }
}
