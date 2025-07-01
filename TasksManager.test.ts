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
import { TasksManager } from './TasksManager';
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';
import { Config } from './Config';

jest.mock('./Config');
jest.mock('./GoogleTasksManager');
jest.mock('./TodoistManager');

describe('TasksManager Tests', () => {
  const mockThread = Mocks.getMockThread({
    getId: () => 'thread-123',
  });

  const mockTaskDetails = {
    title: 'Test Task',
    notes: 'Test Notes',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call GoogleTasksManager when task_service is "Google Tasks"', () => {
    const mockConfig = { task_service: 'Google Tasks' } as Config;
    TasksManager.upsertTask(mockThread, mockTaskDetails, mockConfig);
    expect(GoogleTasksManager.upsertTask).toHaveBeenCalledWith(mockThread, mockTaskDetails, mockConfig);
    expect(TodoistManager.upsertTask).not.toHaveBeenCalled();
  });

  it('should call TodoistManager when task_service is "Todoist"', () => {
    const mockConfig = { task_service: 'Todoist' } as Config;
    TasksManager.upsertTask(mockThread, mockTaskDetails, mockConfig);
    expect(TodoistManager.upsertTask).toHaveBeenCalledWith(mockThread, mockTaskDetails, mockConfig);
    expect(GoogleTasksManager.upsertTask).not.toHaveBeenCalled();
  });

  it('should return true when GoogleTasksManager returns true', () => {
    const mockConfig = { task_service: 'Google Tasks' } as Config;
    (GoogleTasksManager.upsertTask as jest.Mock).mockReturnValue(true);
    const result = TasksManager.upsertTask(mockThread, mockTaskDetails, mockConfig);
    expect(result).toBe(true);
  });

  it('should return false when GoogleTasksManager returns false', () => {
    const mockConfig = { task_service: 'Google Tasks' } as Config;
    (GoogleTasksManager.upsertTask as jest.Mock).mockReturnValue(false);
    const result = TasksManager.upsertTask(mockThread, mockTaskDetails, mockConfig);
    expect(result).toBe(false);
  });

  it('should return true when TodoistManager returns true', () => {
    const mockConfig = { task_service: 'Todoist' } as Config;
    (TodoistManager.upsertTask as jest.Mock).mockReturnValue(true);
    const result = TasksManager.upsertTask(mockThread, mockTaskDetails, mockConfig);
    expect(result).toBe(true);
  });

  it('should return false when TodoistManager returns false', () => {
    const mockConfig = { task_service: 'Todoist' } as Config;
    (TodoistManager.upsertTask as jest.Mock).mockReturnValue(false);
    const result = TasksManager.upsertTask(mockThread, mockTaskDetails, mockConfig);
    expect(result).toBe(false);
  });

  it('should call GoogleTasksManager.findCheckpoint when task_service is "Google Tasks"', () => {
    const mockConfig = { task_service: 'Google Tasks' } as Config;
    TasksManager.findCheckpoint('thread-123', mockConfig);
    expect(GoogleTasksManager.findCheckpoint).toHaveBeenCalledWith('thread-123', mockConfig);
  });

  it('should return null for findCheckpoint when task_service is "Todoist"', () => {
    const mockConfig = { task_service: 'Todoist' } as Config;
    const checkpoint = TasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe(null);
  });
});
