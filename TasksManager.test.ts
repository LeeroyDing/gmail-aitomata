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

import { TasksManager } from './TasksManager';
import { Config } from './Config';
import { JestExpect } from './JestSheets';
import Mocks from './Mocks'; // We will need to recreate a minimal Mocks file

export function testTasksManager(it: Function, expect: JestExpect) {
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
    Tasks.Tasks.list = () => ({ items: tasks });

    const checkpoint = TasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2024-01-02T12:00:00.000Z');
  });

  it('should return null if no completed task is found', () => {
    Tasks.Tasks.list = () => ({ items: [] });
    const checkpoint = TasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe(null);
  });

  it('should create a new task if none exists', () => {
    let insertCalled = false;
    Tasks.Tasks.list = () => ({ items: [] }); // No existing tasks
    Tasks.Tasks.insert = (task, taskListId) => {
      insertCalled = true;
      expect(taskListId).toBe('task-list-id-123');
      expect(task.title).toBe('New Task Title');
      expect(task.notes).toContain('gmail_thread_id: thread-123');
      expect(task.notes).toContain('https://mail.google.com/mail/u/0/#inbox/thread-123');
      return Mocks.getMockTask({});
    };

    TasksManager['taskListIdCache'] = 'task-list-id-123'; // Prime the cache
    TasksManager.upsertTask(mockThread, { is_required: true, title: 'New Task Title', notes: 'New Notes' }, mockConfig);
    expect(insertCalled).toBe(true);
  });

  it('should update an existing task if found', () => {
    let patchCalled = false;
    const existingTask = Mocks.getMockTask({ id: 'task-abc', notes: 'gmail_thread_id: thread-123' });
    Tasks.Tasks.list = () => ({ items: [existingTask] });
    Tasks.Tasks.patch = (task, taskListId, taskId) => {
      patchCalled = true;
      expect(taskListId).toBe('task-list-id-123');
      expect(taskId).toBe('task-abc');
      expect(task.title).toBe('Updated Title');
      return Mocks.getMockTask({});
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
    Tasks.Tasklists.list = () => ({ items: taskLists });
    TasksManager['taskListIdCache'] = null; // Clear cache

    const taskListId = TasksManager['getTaskListId'](mockConfig);
    expect(taskListId).toBe('my-tasks-id');
    expect(TasksManager['taskListIdCache']).toBe('my-tasks-id');

    // Second call should use cache, not API
    Tasks.Tasklists.list = () => { throw new Error("API should not be called again"); };
    const cachedId = TasksManager['getTaskListId'](mockConfig);
    expect(cachedId).toBe('my-tasks-id');
  });
}
