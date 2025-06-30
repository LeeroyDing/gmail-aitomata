// @ts-nocheck
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

import './jest.setup.js';
import { Mocks } from './Mocks';
import { TodoistManager } from './TodoistManager';
import { TasksManager } from './TasksManager';
import { Config } from './Config';

jest.mock('./Config');

describe('TodoistManager Tests', () => {
  const mockConfig = {
    todoist_api_key: 'test-api-key',
    todoist_project_id: 'test-project-id',
  } as Config;

  const mockThread = Mocks.getMockThread({
    getId: () => 'thread-123',
    getPermalink: () => 'https://mail.google.com/mail/u/0/#inbox/thread-123',
  });

  let tasksManager: TodoistManager;

  beforeEach(() => {
    tasksManager = new TodoistManager();
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);
    global.UrlFetchApp.fetch.mockClear();
    global.Utilities = {
      getUuid: jest.fn().mockReturnValue('mock-uuid'),
    } as any;
  });

  it('should create a new task in Todoist', () => {
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(200, '[]'));
    tasksManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);

    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      'https://api.todoist.com/rest/v2/tasks',
      expect.objectContaining({
        method: 'post',
        payload: JSON.stringify({
          content: 'New Task Title',
          description: 'New Notes\n\nLink to Email:\nhttps://mail.google.com/mail/u/0/#inbox/thread-123\n\n---\nmanaged_by: gmail-automata\ngmail_thread_id: thread-123',
          project_id: 'test-project-id',
        }),
      })
    );
  });

  it('should update an existing task in Todoist', () => {
    const existingTask = { id: 'task-abc', content: 'gmail_thread_id: thread-123' };
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(200, JSON.stringify([existingTask])));
    tasksManager.upsertTask(mockThread, { title: 'Updated Title', notes: 'Updated Notes' }, mockConfig);

    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      `https://api.todoist.com/rest/v2/tasks/${existingTask.id}`,
      expect.objectContaining({
        method: 'post',
        payload: JSON.stringify({
          content: 'Updated Title',
          description: 'Updated Notes\n\nLink to Email:\nhttps://mail.google.com/mail/u/0/#inbox/thread-123\n\n---\nmanaged_by: gmail-automata\ngmail_thread_id: thread-123',
          project_id: 'test-project-id',
        }),
      })
    );
  });

  it('should find a checkpoint for a completed task', () => {
    const completedTask = { id: 'task-abc', content: 'gmail_thread_id: thread-123', is_completed: true, completed_at: '2024-01-01T12:00:00.000Z' };
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(200, JSON.stringify([completedTask])));
    const checkpoint = tasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should return null if no completed task is found', () => {
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(200, '[]'));
    const checkpoint = tasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe(null);
  });

  it('should handle API errors gracefully', () => {
    (global.UrlFetchApp.fetch as jest.Mock).mockImplementation(() => {
      throw new Error('API Error');
    });
    const checkpoint = tasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe(null);
    tasksManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);
    // No exception should be thrown
  });
});
