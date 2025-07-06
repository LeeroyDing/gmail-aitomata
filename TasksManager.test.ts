/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law_change
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { TasksManagerFactory } from './TasksManagerFactory';
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';
import { Config } from './Config';

describe('TasksManagerFactory', () => {
  it('should return a GoogleTasksManager instance', () => {
    const config = { task_service: 'Google Tasks' } as Config;
    const manager = TasksManagerFactory.getTasksManager(config);
    expect(manager).toBeInstanceOf(GoogleTasksManager);
  });

  it('should return a TodoistManager instance', () => {
    const config = { task_service: 'Todoist' } as Config;
    const manager = TasksManagerFactory.getTasksManager(config);
    expect(manager).toBeInstanceOf(TodoistManager);
  });

  it('should throw an error for an unknown task service', () => {
    const config = { task_service: 'Unknown' } as Config;
    expect(() => TasksManagerFactory.getTasksManager(config)).toThrow(
      'Unknown task service: Unknown'
    );
  });
});
