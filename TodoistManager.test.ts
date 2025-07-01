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
  const mockConfig = {
    todoist_api_key: 'test-api-key',
    todoist_project_id: 'test-project-id',
  } as Config;

  const mockThread = Mocks.getMockThread({
    getId: () => 'thread-123',
    getPermalink: () => 'https://mail.google.com/mail/u/0/#inbox/thread-123',
  });

  beforeEach(() => {
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);
    global.UrlFetchApp.fetch.mockClear();
  });

  it('should create a new task in Todoist', () => {
    TodoistManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);

    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      'https://api.todoist.com/rest/v2/tasks',
      expect.objectContaining({
        method: 'post',
        contentType: 'application/json',
        headers: {
          Authorization: 'Bearer test-api-key',
        },
        payload: JSON.stringify({
          content: '[New Task Title](https://mail.google.com/mail/u/0/#inbox/thread-123)',
          description: 'New Notes',
          project_id: 'test-project-id',
          due_string: 'today',
        }),
      })
    );
  });
});
