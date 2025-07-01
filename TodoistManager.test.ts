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
import { Config } from './Config';

jest.mock('./Config');

describe('TodoistManager Tests', () => {
  const mockThread = Mocks.getMockThread({
    getId: () => 'thread-123',
    getPermalink: () => 'https://mail.google.com/mail/u/0/#inbox/thread-123',
    getFirstMessageSubject: () => 'Test Subject',
  });

  beforeEach(() => {
    global.UrlFetchApp.fetch.mockClear();
  });

  it('should return true on successful task creation', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
      todoist_project_id: 'test-project-id',
    } as Config;
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(200, ''));
    const result = TodoistManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);
    expect(result).toBe(true);
  });

  it('should use the v1 API endpoint', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
      todoist_project_id: 'test-project-id',
    } as Config;
    TodoistManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);

    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      'https://api.todoist.com/api/v1/tasks',
      expect.any(Object)
    );
  });

  
    it('should find the latest checkpoint from the activity log', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
    } as Config;
    const mockActivity = {
      events: [
        { event_date: '2024-01-02T12:00:00.000Z' },
        { event_date: '2024-01-01T12:00:00.000Z' },
      ],
    };
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(200, JSON.stringify(mockActivity)));
    global.GmailApp = {
      getThreadById: jest.fn().mockReturnValue(mockThread),
    } as any;

    const checkpoint = TodoistManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2024-01-02T12:00:00.000Z');
  });

  it('should return null if no checkpoint is found', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
    } as Config;
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(Mocks.getMockUrlFetchResponse(200, JSON.stringify({ events: [] })));
    global.GmailApp = {
      getThreadById: jest.fn().mockReturnValue(mockThread),
    } as any;

    const checkpoint = TodoistManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe(null);
  });

  it('should create a new task with project ID and default due date', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
      todoist_project_id: 'test-project-id',
    } as Config;
    TodoistManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);

    const payload = JSON.parse((global.UrlFetchApp.fetch as jest.Mock).mock.calls[0][1].payload);
    expect(payload).toEqual({
      content: 'New Task Title',
      description: 'New Notes\n\n---\n\nOriginal email: [Test Subject](https://mail.google.com/mail/u/0/#inbox/thread-123)',
      due_string: 'today',
      project_id: 'test-project-id',
    });
  });

  it('should create a new task without project ID if not provided', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
      todoist_project_id: '',
    } as Config;
    TodoistManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);

    const payload = JSON.parse((global.UrlFetchApp.fetch as jest.Mock).mock.calls[0][1].payload);
    expect(payload).toEqual({
      content: 'New Task Title',
      description: 'New Notes\n\n---\n\nOriginal email: [Test Subject](https://mail.google.com/mail/u/0/#inbox/thread-123)',
      due_string: 'today',
    });
  });
});
