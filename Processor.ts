
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
import { FeedbackManager } from './FeedbackManager';

import { TasksManagerFactory } from './TasksManagerFactory';

export class Processor {
  /**
   * Fetches and processes all unprocessed threads.
   */
  public static processAllUnprocessedThreads() {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      console.log('Could not obtain lock. Another instance is likely running.');
      console.warn('Could not obtain lock. Another instance is likely running.');
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

      // Handle Force Task Label
      const forceLabel = GmailApp.getUserLabelByName(config.force_task_label);
      let forcedThreads: GoogleAppsScript.Gmail.GmailThread[] = [];
      if (forceLabel) {
        forcedThreads = forceLabel.getThreads(0, config.max_threads);
      }

      // Combine and deduplicate
      const allThreadsMap = new Map<string, GoogleAppsScript.Gmail.GmailThread>();
      unprocessedThreads.forEach(t => allThreadsMap.set(t.getId(), t));
      forcedThreads.forEach(t => allThreadsMap.set(t.getId(), t));

      const allThreads = Array.from(allThreadsMap.values());

      console.log(`Found ${allThreads.length} threads to process (${unprocessedThreads.length} unprocessed, ${forcedThreads.length} forced).`);

      // 1. Analyze Feedback (Learn from user edits)
      FeedbackManager.analyzeFeedback(tasksManager, config);

      if (allThreads.length === 0) {
        return;
      }

      const threadsWithContext = allThreads.map(thread => {
        const existingTask = tasksManager.findTask(thread.getId(), config);
        return { thread, existingTask };
      });

      const plans = AIAnalyzer.generatePlans(threadsWithContext, aiContext, config);

      if (plans.length !== allThreads.length) {
        throw new Error(`Mismatch between number of threads (${allThreads.length}) and plans received from AI (${plans.length}).`);
      }

      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        const thread = allThreads[i];
        const threadId = thread.getId();

        // Check if forced
        const isForced = thread.getLabels().some(l => l.getName() === config.force_task_label);
        if (isForced) {
          console.log(`Thread ${threadId} is forced. Overriding action to CREATE_TASK.`);
          plan.action = 'CREATE_TASK';
          // If AI didn't generate a task object because it thought DO_NOTHING, we need to ensure one exists.
          // But generatePlans usually returns a task object even for DO_NOTHING if we ask it nicely, or we might need to handle null task.
          // The prompt says: "If the action is 'DO_NOTHING', the "task" object should be null."
          // So if we force CREATE_TASK, we might have a null task.
          // In that case, we should probably use a default task or ask AI again? 
          // For now, let's assume the AI might have generated a task but decided DO_NOTHING.
          // If task is null, we can't create it. We'll skip and log warning.
          if (!plan.task) {
            console.warn(`Forced thread ${threadId} has no task details from AI. Skipping.`);
            continue;
          }
        }

        try {
          console.log(`Executing plan for thread ${threadId}: ${plan.action}`);

          let markRead = false;

          switch (plan.action) {
            case 'CREATE_TASK':
            case 'UPDATE_TASK':
              if (plan.task) {
                const taskId = tasksManager.upsertTask(thread, plan.task, config, thread.getPermalink());
                if (taskId) {
                  FeedbackManager.recordTaskCreation(threadId, taskId, plan.task);
                  markRead = true;
                }
              }
              break;
            case 'REOPEN_AND_UPDATE_TASK':
              if (plan.task) {
                const existingTask = tasksManager.findTask(threadId, config);
                if (existingTask && existingTask.id) {
                  tasksManager.reopenTask(existingTask.id, config);
                  const taskId = tasksManager.upsertTask(thread, plan.task, config, thread.getPermalink());
                  if (taskId) {
                    FeedbackManager.recordTaskCreation(threadId, taskId, plan.task);
                    markRead = true;
                  }
                } else {
                  console.log(`Could not find existing task to reopen for thread ${threadId}. Creating a new one instead.`);
                  const taskId = tasksManager.upsertTask(thread, plan.task, config, thread.getPermalink());
                  if (taskId) {
                    FeedbackManager.recordTaskCreation(threadId, taskId, plan.task);
                    markRead = true;
                  }
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

          if (forceLabel) {
            thread.removeLabel(forceLabel);
          }
          thread.removeLabel(unprocessedLabel);
          if (processedLabel) {
            thread.addLabel(processedLabel);
          }
        } catch (e) {
          console.error(`Failed to process thread ${threadId}: ${e}`);
          console.log(`ERROR: Failed to process thread ${threadId}: ${e} - ${e.stack}`);
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
