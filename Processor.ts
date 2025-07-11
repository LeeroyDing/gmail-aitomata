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
import { AIAnalyzer, PlanOfAction } from './AIAnalyzer';
import { TasksManager } from './TasksManager';



import { TasksManagerFactory } from './TasksManagerFactory';

export class Processor {
  /**
   * Processes a single Gmail thread.
   */
  private static processThread(
    thread: GoogleAppsScript.Gmail.GmailThread,
    config: Config,
    aiContext: string,
    plan: PlanOfAction | null,
    tasksManager: TasksManager
  ) {
    const threadId = thread.getId();
    console.log(`Processing thread: ${thread.getFirstMessageSubject()} (${threadId})`);

    // 1. Find the last checkpoint for this thread from the task manager.
    const checkpoint = tasksManager.findCheckpoint(threadId, config);
    const checkpointTime = checkpoint ? new Date(checkpoint).getTime() : 0;

    // 2. Filter for messages that are newer than the checkpoint.
    const newMessages = thread.getMessages().filter(message => {
      return message.getDate().getTime() > checkpointTime;
    });

    if (newMessages.length === 0) {
      console.log(`No new messages found for thread ${threadId} since last checkpoint. Skipping.`);
      // Still need to remove the 'unprocessed' label
      thread.removeLabel(GmailApp.getUserLabelByName(config.unprocessed_label));
      if (config.processed_label) {
        thread.addLabel(GmailApp.getUserLabelByName(config.processed_label));
      }
      return;
    }

    // 3. Get a "Plan of Action" from the AI.
    if (!plan) {
      console.error(`Failed to get a plan from the AI for thread ${threadId}.`);
      // Potentially move to an error state
      return;
    }

    // 4. Execute the plan.
    let markRead = false;

    if (plan.task) {
      console.log(`Plan for thread ${threadId}:`, JSON.stringify(plan, null, 2));
      const confidenceDetails = `
--- 
**Confidence Score:** ${plan.confidence.score}/100
**Reasoning:** ${plan.confidence.reasoning}
**Why not higher:** ${plan.confidence.not_higher_reasoning}
**Why not lower:** ${plan.confidence.not_lower_reasoning}
`;
      Logger.log(`Confidence for thread ${threadId}: ${confidenceDetails}`);

      Logger.log(`Creating task for thread ${threadId}: ${plan.task.title}`);
      const permalink = thread.getPermalink();
      const taskCreated = tasksManager.upsertTask(thread, plan.task, config, permalink);
      if (taskCreated) {
        markRead = true;
      } else {
        // If the task creation fails, leave the email unread and do not mark as processed.
        Logger.log(`Task creation failed for thread ${threadId}. Leaving email as unread.`);
        return;
      }
    } else {
      // If no task, leave the email unread
      Logger.log(`No task created for thread ${threadId}. Leaving email as unread.`);
    }

    if (markRead) {
      Logger.log(`Marking thread ${threadId} as read.`);
      thread.markRead();
    } else {
      Logger.log(`Marking thread ${threadId} as unread.`);
      thread.markUnread();
    }

    // 5. Mark as processed.
    thread.removeLabel(GmailApp.getUserLabelByName(config.unprocessed_label));
    if (config.processed_label) {
      thread.addLabel(GmailApp.getUserLabelByName(config.processed_label));
    }
    console.log(`Finished processing thread ${threadId}.`);
  }

  /**
   * Fetches and processes all unprocessed threads.
   */
  public static processAllUnprocessedThreads() {
    const lock = LockService.getScriptLock();
    // Try to acquire the lock, waiting for a maximum of 10 seconds.
    if (!lock.tryLock(10000)) {
      console.log('Could not obtain lock. Another instance is likely running.');
      Logger.log('Could not obtain lock. Another instance is likely running.');
      return;
    }

    try {
      const startTime = new Date();
      const config = Config.getConfig();
      const aiContext = AIAnalyzer.getContext(); // Assuming a static method to get context
      const tasksManager = TasksManagerFactory.getTasksManager(config);

      const unprocessedLabel = GmailApp.getUserLabelByName(config.unprocessed_label);
      if (!unprocessedLabel) {
        throw new Error(`Label '${config.unprocessed_label}' not found. Please create it.`);
      }
      
      if (config.processed_label) {
        const processedLabel = GmailApp.getUserLabelByName(config.processed_label);
        if (!processedLabel) {
          throw new Error(`Label '${config.processed_label}' not found. Please create it.`);
        }
      }

      const unprocessedThreads = unprocessedLabel.getThreads(0, config.max_threads);
      Logger.log(`Found ${unprocessedThreads.length} unprocessed threads.`);
      if (unprocessedThreads.length === 0) {
        Logger.log(`All emails are processed, skip.`);
        return;
      }

      const plans = AIAnalyzer.generatePlans(unprocessedThreads, aiContext, config);
      let processedThreadCount = 0;
      let allPass = true;

      for (let i = 0; i < unprocessedThreads.length; i++) {
        const thread = unprocessedThreads[i];
        const plan = plans[i];
        try {
          this.processThread(thread, config, aiContext, plan, tasksManager);
          processedThreadCount++;
        } catch (e) {
          allPass = false;
          const threadId = thread.getId();
          console.error(`Failed to process thread ${threadId}: ${e}`);
          Logger.log(`Failed to process thread ${threadId}: ${e}`);
          // Apply error label and move to inbox for visibility
          const errorLabel = GmailApp.getUserLabelByName(config.processing_failed_label);
          if (errorLabel) {
            thread.addLabel(errorLabel);
          }
          thread.moveToInbox();
        }
      }

      Logger.log(`Processed ${processedThreadCount} out of ${unprocessedThreads.length}.`);
      Stats.addStatRecord(startTime, processedThreadCount, 0); // message count is harder to get now

      if (!allPass) {
        throw new Error('Some threads failed to process. Please check the logs and your inbox for emails with the error label.');
      }
    } finally {
      lock.releaseLock();
    }
  }
}


