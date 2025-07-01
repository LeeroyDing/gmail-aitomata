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
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';

export class TasksManager {
  public static findCheckpoint(threadId: string, config: Config): string | null {
    if (config.task_service === 'Todoist') {
      // Todoist does not have a concept of checkpoints in the same way as Google Tasks.
      // Returning null will cause all messages in the thread to be processed.
      return null;
    }
    return GoogleTasksManager.findCheckpoint(threadId, config);
  }

  public static upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    taskDetails: NonNullable<PlanOfAction['task']>,
    config: Config
  ): boolean {
    if (config.task_service === 'Todoist') {
      return TodoistManager.upsertTask(thread, taskDetails, config);
    } else {
      return GoogleTasksManager.upsertTask(thread, taskDetails, config);
    }
  }
}