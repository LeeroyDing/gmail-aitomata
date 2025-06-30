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

/**
 * Defines the interface for a task management service.
 */
export interface TasksManager {
  upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    taskDetails: NonNullable<PlanOfAction['task']>,
    config: Config
  ): void;

  findCheckpoint(threadId: string, config: Config): string | null;
}