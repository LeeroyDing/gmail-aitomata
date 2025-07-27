
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
import { Stats } from './Stats';
import { AIAnalyzer } from './AIAnalyzer';

import { TasksManagerFactory } from './TasksManagerFactory';

export class Processor {
  /**
   * Fetches and processes all unprocessed threads.
   */
  public static processAllUnprocessedThreads() {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      console.log('Could not obtain lock. Another instance is likely running.');
      Logger.log('Could not obtain lock. Another instance is likely running.');
      return;
    }

    try {
      const startTime = new Date();
      const config = Config.getConfig();
      const aiContext = AIAnalyzer.getContext();
      const tasksManagerFactory = new TasksManagerFactory();
      const tasksManager = tasksManagerFactory.getTasksManager(config);

      const unprocessedLabel = GmailApp.getUserLabelByName(config.unprocessed_label);
      if (!unprocessedLabel) {
        throw new Error(`Label '${config.unprocessed_label}' not found. Please create it.`);
      }

      const processedLabel = config.processed_label ? GmailApp.getUserLabelByName(config.processed_label) : null;
      if (config.processed_label && !processedLabel) {
        throw new Error(`Label '${config.processed_label}' not found. Please create it.`);
      }

      const unprocessedThreads = unprocessedLabel.getThreads(0, config.max_threads);
      Logger.log(`Found ${unprocessedThreads.length} unprocessed threads.`);
      if (unprocessedThreads.length === 0) {
        return;
      }

      const threadsWithContext = unprocessedThreads.map(thread => {
        const existingTask = tasksManager.findTask(thread.getId(), config);
        return { thread, existingTask };
      });

      const plans = AIAnalyzer.generatePlans(threadsWithContext, aiContext, config);

      if (plans.length !== unprocessedThreads.length) {
        throw new Error(`Mismatch between number of threads (${unprocessedThreads.length}) and plans received from AI (${plans.length}).`);
      }

      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        const thread = unprocessedThreads[i];
        const threadId = thread.getId();

        try {
          Logger.log(`Executing plan for thread ${threadId}: ${plan.action}`);

          let markRead = false;

          switch (plan.action) {
            case 'CREATE_TASK':
            case 'UPDATE_TASK':
              if (plan.task) {
                tasksManager.upsertTask(thread, plan.task, config, thread.getPermalink());
                markRead = true;
              }
              break;
            case 'REOPEN_AND_UPDATE_TASK':
              if (plan.task) {
                const existingTask = tasksManager.findTask(threadId, config);
                if (existingTask && existingTask.id) {
                  tasksManager.reopenTask(existingTask.id, config);
                  tasksManager.upsertTask(thread, plan.task, config, thread.getPermalink());
                  markRead = true;
                } else {
                  Logger.log(`Could not find existing task to reopen for thread ${threadId}. Creating a new one instead.`);
                  tasksManager.upsertTask(thread, plan.task, config, thread.getPermalink());
                  markRead = true;
                }
              }
              break;
            case 'DO_NOTHING':
              // Do nothing, leave the thread as is.
              break;
          }

          if (markRead) {
            thread.markRead();
          }

          thread.removeLabel(unprocessedLabel);
          if (processedLabel) {
            thread.addLabel(processedLabel);
          }
        } catch (e) {
          console.error(`Failed to process thread ${threadId}: ${e}`);
          Logger.log(`ERROR: Failed to process thread ${threadId}: ${e} - ${e.stack}`);
          const errorLabel = GmailApp.getUserLabelByName(config.processing_failed_label);
          if (errorLabel) {
            thread.addLabel(errorLabel);
          }
        }
      }

      Stats.addStatRecord(startTime, unprocessedThreads.length, 0);
    } finally {
      lock.releaseLock();
    }
  }
}
