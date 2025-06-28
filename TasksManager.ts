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

export class TasksManager {
  private static taskListIdCache: string | null = null;

  /**
   * Gets the ID of the task list specified in the config.
   * Caches the ID to avoid repeated API calls.
   * @param {Config} config - The application configuration.
   * @returns {string} The ID of the task list.
   */
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

  /**
   * Finds the most recent completed task associated with a given Gmail thread ID.
   * @param {string} threadId - The ID of the Gmail thread.
   * @param {Config} config - The application configuration.
   * @returns {string | null} The completion date (timestamp) of the task, or null if not found.
   */
  public static findCheckpoint(threadId: string, config: Config): string | null {
    if (!Tasks || !Tasks.Tasks) {
      return null;
    }
    const taskListId = this.getTaskListId(config);
    let checkpoint: string | null = null;
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
              if (!checkpoint || new Date(task.completed) > new Date(checkpoint)) {
                checkpoint = task.completed;
              }
            }
          }
        }
        pageToken = response?.nextPageToken;
      } while (pageToken);
    } catch (e) {
      console.error(`Failed to list tasks: ${e}`);
      Logger.log(`Failed to list tasks: ${e}`);
      return null; // Fail gracefully
    }
    
    console.log(`Found checkpoint for thread ${threadId}: ${checkpoint}`);
    return checkpoint;
  }

  /**
   * Creates a new task or updates an existing one for a given Gmail thread.
   * @param {GoogleAppsScript.Gmail.GmailThread} thread - The Gmail thread.
   * @param {Object} taskDetails - The details of the task from the AI's plan.
   * @param {Config} config - The application configuration.
   */
  public static upsertTask(
    thread: GoogleAppsScript.Gmail.GmailThread,
    taskDetails: NonNullable<PlanOfAction['task']>,
    config: Config
  ) {
    if (!Tasks || !Tasks.Tasks) {
      return;
    }
    const threadId = thread.getId();
    const permalink = thread.getPermalink();
    const taskListId = this.getTaskListId(config);

    const existingTask = this.findActiveTaskByThreadId(threadId, config);

    const taskData: Task = {
      title: taskDetails.title,
      notes: this.formatTaskNotes(taskDetails.notes, permalink, threadId),
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
    } catch (e) {
      console.error(`Failed to upsert task for thread ${threadId}: ${e}`);
      Logger.log(`Failed to upsert task for thread ${threadId}: ${e}`);
    }
  }

  /**
   * Finds an active (incomplete) task by its associated Gmail thread ID.
   * @param {string} threadId - The Gmail thread ID stored in the task's notes.
   * @param {Config} config - The application configuration.
   * @returns {Task | null} The found task object, or null.
   */
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

  /**
   * Formats the notes field for a Google Task.
   */
  private static formatTaskNotes(
    aiSummary: string,
    permalink: string,
    threadId: string
  ): string {
    return `AI Summary:\n${aiSummary}\n\nLink to Email:\n${permalink}\n\n---\nmanaged_by: gmail-automata\ngmail_thread_id: ${threadId}`;
  }

  public static testTasksManager(it: Function, expect: (actual: any) => any) {
    const mockConfig = {
      default_task_list_name: 'My Tasks',
    } as Config;

    const mockThread = Mocks.getMockThread({
      id: 'thread-123',
      permalink: 'https://mail.google.com/mail/u/0/#inbox/thread-123',
    });

    it('should find the latest checkpoint from completed tasks', () => {
      const tasks = [
        Mocks.getMockTask({ notes: 'gmail_thread_id: thread-123', completed: '2024-01-01T12:00:00.000Z' }),
        Mocks.getMockTask({ notes: 'gmail_thread_id: thread-123', completed: '2024-01-02T12:00:00.000Z' }), // latest
        Mocks.getMockTask({ notes: 'gmail_thread_id: thread-456', completed: '2024-01-03T12:00:00.000Z' }),
      ];
      global.Tasks = { Tasks: { list: () => ({ items: tasks }) } };

      const checkpoint = TasksManager.findCheckpoint('thread-123', mockConfig);
      expect(checkpoint).toBe('2024-01-02T12:00:00.000Z');
    });

    it('should return null if no completed task is found', () => {
      global.Tasks = { Tasks: { list: () => ({ items: [] }) } };
      const checkpoint = TasksManager.findCheckpoint('thread-123', mockConfig);
      expect(checkpoint).toBe(null);
    });

    it('should create a new task if none exists', () => {
      let insertCalled = false;
      global.Tasks = {
        Tasks: {
          list: () => ({ items: [] }), // No existing tasks
          insert: (task: GoogleAppsScript.Tasks.Schema.Task, taskListId: string) => {
            insertCalled = true;
            expect(taskListId).toBe('task-list-id-123');
            expect(task.title).toBe('New Task Title');
            expect(task.notes).toContain('gmail_thread_id: thread-123');
            expect(task.notes).toContain('https://mail.google.com/mail/u/0/#inbox/thread-123');
            return Mocks.getMockTask({});
          }
        }
      };

      TasksManager['taskListIdCache'] = 'task-list-id-123'; // Prime the cache
      TasksManager.upsertTask(mockThread, { is_required: true, title: 'New Task Title', notes: 'New Notes' }, mockConfig);
      expect(insertCalled).toBe(true);
    });

    it('should update an existing task if found', () => {
      let patchCalled = false;
      const existingTask = Mocks.getMockTask({ id: 'task-abc', notes: 'gmail_thread_id: thread-123' });
      global.Tasks = {
        Tasks: {
          list: () => ({ items: [existingTask] }),
          patch: (task: GoogleAppsScript.Tasks.Schema.Task, taskListId: string, taskId: string) => {
            patchCalled = true;
            expect(taskListId).toBe('task-list-id-123');
            expect(taskId).toBe('task-abc');
            expect(task.title).toBe('Updated Title');
            return Mocks.getMockTask({});
          }
        }
      };

      TasksManager['taskListIdCache'] = 'task-list-id-123';
      TasksManager.upsertTask(mockThread, { is_required: true, title: 'Updated Title', notes: 'Updated Notes' }, mockConfig);
      expect(patchCalled).toBe(true);
    });

    it('should get task list ID by name and cache it', () => {
      const taskLists = [
          Mocks.getMockTaskList({ title: 'Other Tasks', id: 'other-id'}),
          Mocks.getMockTaskList({ title: 'My Tasks', id: 'my-tasks-id'}),
      ];
      global.Tasks = { Tasklists: { list: () => ({ items: taskLists }) } };
      TasksManager['taskListIdCache'] = null; // Clear cache

      const taskListId = TasksManager['getTaskListId'](mockConfig);
      expect(taskListId).toBe('my-tasks-id');
      expect(TasksManager['taskListIdCache']).toBe('my-tasks-id');

      // Second call should use cache, not API
      global.Tasks.Tasklists.list = () => { throw new Error("API should not be called again"); };
      const cachedId = TasksManager['getTaskListId'](mockConfig);
      expect(cachedId).toBe('my-tasks-id');
    });

    it('should throw an error if task list is not found', () => {
      global.Tasks = { Tasklists: { list: () => ({ items: [] }) } };
      TasksManager['taskListIdCache'] = null; // Clear cache
      expect(() => TasksManager['getTaskListId'](mockConfig)).toThrow("Task list with name 'My Tasks' not found.");
    });
  }
}
