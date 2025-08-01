
import { TasksManagerFactory } from './TasksManagerFactory';
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';
import { Config } from './Config';

jest.mock('./GoogleTasksManager');
jest.mock('./TodoistManager');

describe('TasksManagerFactory', () => {
  it('should return a GoogleTasksManager instance', () => {
    const config = { task_service: 'Google Tasks' } as Config;
    const factory = new TasksManagerFactory();
    const manager = factory.getTasksManager(config);
    expect(manager).toBeInstanceOf(GoogleTasksManager);
  });

  it('should return a TodoistManager instance', () => {
    const config = { task_service: 'Todoist' } as Config;
    const factory = new TasksManagerFactory();
    const manager = factory.getTasksManager(config);
    expect(manager).toBeInstanceOf(TodoistManager);
  });

  it('should throw an error for an unknown task service', () => {
    const config = { task_service: 'Unknown' } as Config;
    const factory = new TasksManagerFactory();
    expect(() => factory.getTasksManager(config)).toThrow(
      'Unknown task service: Unknown'
    );
  });
});
