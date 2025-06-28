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
import { TasksManager } from './TasksManager';

// Define the possible inbox actions as a type
export type InboxAction = "ARCHIVE" | "TRASH" | "INBOX";

export class Processor {
  /**
   * Processes a single Gmail thread.
   */
  private static processThread(
    thread: GoogleAppsScript.Gmail.GmailThread,
    config: Config,
    aiContext: string
  ) {
    const threadId = thread.getId();
    console.log(`Processing thread: ${thread.getFirstMessageSubject()} (${threadId})`);

    // 1. Find the last checkpoint for this thread from Google Tasks.
    const checkpoint = TasksManager.findCheckpoint(threadId, config);
    const checkpointTime = checkpoint ? new Date(checkpoint).getTime() : 0;

    // 2. Filter for messages that are newer than the checkpoint.
    const newMessages = thread.getMessages().filter(message => {
      return message.getDate().getTime() > checkpointTime;
    });

    if (newMessages.length === 0) {
      console.log(`No new messages found for thread ${threadId} since last checkpoint. Skipping.`);
      // Still need to remove the 'unprocessed' label
      thread.removeLabel(GmailApp.getUserLabelByName(config.unprocessed_label));
      thread.addLabel(GmailApp.getUserLabelByName(config.processed_label));
      return;
    }

    // 3. Get a "Plan of Action" from the AI.
    const plan = AIAnalyzer.generatePlan(newMessages, aiContext, config);

    if (!plan) {
      console.error(`Failed to get a plan from the AI for thread ${threadId}.`);
      // Potentially move to an error state
      return;
    }

    // 4. Execute the plan.
    if (plan.task && plan.task.is_required) {
      TasksManager.upsertTask(thread, plan.task, config);
    }

    // Apply inbox actions
    switch (plan.action.move_to) {
      case 'ARCHIVE':
        thread.moveToArchive();
        break;
      case 'TRASH':
        thread.moveToTrash();
        break;
      case 'INBOX':
        thread.moveToInbox();
        break;
    }

    if (plan.action.mark_read) {
      thread.markRead();
    } else {
      thread.markUnread();
    }

    // 5. Mark as processed.
    thread.removeLabel(GmailApp.getUserLabelByName(config.unprocessed_label));
    thread.addLabel(GmailApp.getUserLabelByName(config.processed_label));
    console.log(`Finished processing thread ${threadId}.`);
  }

  /**
   * Fetches and processes all unprocessed threads.
   */
  public static processAllUnprocessedThreads() {
    const startTime = new Date();
    const config = Config.getConfig();
    const aiContext = AIAnalyzer.getContext(); // Assuming a static method to get context

    const unprocessedLabel = GmailApp.getUserLabelByName(config.unprocessed_label);
    if (!unprocessedLabel) {
      throw new Error(`Label '${config.unprocessed_label}' not found. Please create it.`);
    }
    
    const processedLabel = GmailApp.getUserLabelByName(config.processed_label);
    if (!processedLabel) {
        throw new Error(`Label '${config.processed_label}' not found. Please create it.`);
    }

    const unprocessedThreads = unprocessedLabel.getThreads(0, config.max_threads);
    Logger.log(`Found ${unprocessedThreads.length} unprocessed threads.`);
    if (unprocessedThreads.length === 0) {
      Logger.log(`All emails are processed, skip.`);
      return;
    }

    let processedThreadCount = 0;
    let allPass = true;

    for (const thread of unprocessedThreads) {
      try {
        this.processThread(thread, config, aiContext);
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
  }

  public static testProcessing(it: Function, expect: (actual: any) => any) {
    // Mock dependencies
    const AIAnalyzer = global.AIAnalyzer;
    const TasksManager = global.TasksManager;
    const GmailApp = global.GmailApp;
    const Logger = global.Logger;

    const mockConfig = {
        unprocessed_label: 'unprocessed',
        processed_label: 'processed',
        processing_failed_label: 'error',
        max_threads: 50,
    } as any;

    it('should process a simple thread correctly', () => {
        // Setup
        const mockThread = Mocks.getMockThread({
            getId: () => 'thread-1',
            getFirstMessageSubject: () => 'Test Subject',
            getMessages: () => [Mocks.getMockMessage({ getDate: () => new Date() })],
            removeLabel: jest.fn(),
            addLabel: jest.fn(),
            moveToArchive: jest.fn(),
        });
        
        AIAnalyzer.getContext = jest.fn().mockReturnValue('Test Context');
        TasksManager.findCheckpoint = jest.fn().mockReturnValue(null);
        const mockPlan = {
            action: { move_to: 'ARCHIVE', mark_read: true },
            task: { is_required: false }
        };
        AIAnalyzer.generatePlan = jest.fn().mockReturnValue(mockPlan);
        TasksManager.upsertTask = jest.fn();
        
        const unprocessedLabel = { getThreads: () => [mockThread] };
        GmailApp.getUserLabelByName = jest.fn((name) => {
            if (name === 'unprocessed') return unprocessedLabel;
            return { getName: () => name };
        });

        // Execute
        Processor.processAllUnprocessedThreads();

        // Verify
        expect(TasksManager.findCheckpoint).toHaveBeenCalledWith('thread-1', expect.anything());
        expect(AIAnalyzer.generatePlan).toHaveBeenCalled();
        expect(TasksManager.upsertTask).not.toHaveBeenCalled();
        expect(mockThread.moveToArchive).toHaveBeenCalled();
        expect(mockThread.removeLabel).toHaveBeenCalledWith(unprocessedLabel);
    });
  }
}