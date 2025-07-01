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
  });

  beforeEach(() => {
    global.UrlFetchApp.fetch.mockClear();
  });

  it('should create a new task with project ID and default due date', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
      todoist_project_id: 'test-project-id',
    } as Config;
    TodoistManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);

    const payload = JSON.parse((global.UrlFetchApp.fetch as jest.Mock).mock.calls[0][1].payload);
    expect(payload).toEqual({
          content: '[New Task Title](https://mail.google.com/mail/u/0/#inbox/thread-123)',
          description: 'New Notes',
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
          content: '[New Task Title](https://mail.google.com/mail/u/0/#inbox/thread-123)',
          description: 'New Notes',
          due_string: 'today',
        });
  });

  it('should create a new task with a specific due date', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
      todoist_project_id: 'test-project-id',
    } as Config;
    TodoistManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes', due_date: '2025-12-31' }, mockConfig);

    const payload = JSON.parse((global.UrlFetchApp.fetch as jest.Mock).mock.calls[0][1].payload);
    expect(payload).toEqual({
          content: '[New Task Title](https://mail.google.com/mail/u/0/#inbox/thread-123)',
          description: 'New Notes',
          project_id: 'test-project-id',
          due_date: '2025-12-31',
        });
  });

  it('should create a new task with a due string', () => {
    const mockConfig = {
      todoist_api_key: 'test-api-key',
      todoist_project_id: 'test-project-id',
    } as Config;
    TodoistManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes', due_date: 'next week' }, mockConfig);

    const payload = JSON.parse((global.UrlFetchApp.fetch as jest.Mock).mock.calls[0][1].payload);
    expect(payload).toEqual({
          content: '[New Task Title](https://mail.google.com/mail/u/0/#inbox/thread-123)',
          description: 'New Notes',
          project_id: 'test-project-id',
          due_string: 'next week',
        });
  });
});
