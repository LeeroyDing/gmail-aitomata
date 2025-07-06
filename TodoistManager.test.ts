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

import { Mocks } from './Mocks';
import { TodoistManager } from './TodoistManager';
import { Config } from './Config';

describe('TodoistManager', () => {
  let manager: TodoistManager;
  let mockConfig: Config;

  beforeEach(() => {
    manager = new TodoistManager();
    mockConfig = Mocks.createMockConfig();
    global.UrlFetchApp = Mocks.createMockUrlFetchApp();
  });

  it('should create a new task', () => {
    const thread = Mocks.getMockThread({ getFirstMessageSubject: () => 'Test Thread' });
    const task = { title: 'Test Task', notes: 'Test Notes' };
    const result = manager.upsertTask(thread, task, mockConfig);
    expect(result).toBe(true);
    expect(global.UrlFetchApp.fetch).toHaveBeenCalled();
  });

  it('should find a checkpoint', () => {
    const checkpoint = manager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBeNull();
  });
});
