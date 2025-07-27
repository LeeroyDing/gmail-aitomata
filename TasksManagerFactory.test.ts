
import { TasksManagerFactory } from './TasksManagerFactory';
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';
import { Config } from './Config';
import { Mocks } from './Mocks';

jest.mock('./GoogleTasksManager');
jest.mock('./TodoistManager');

describe('TasksManagerFactory', () => {
  let factory: TasksManagerFactory;
  let mockConfig: Config;

  beforeEach(() => {
    factory = new TasksManagerFactory();
    mockConfig = Mocks.createMockConfig();
  });

  it('should return a GoogleTasksManager instance', () => {
    (mockConfig as any).task_service = 'Google Tasks';
    const manager = factory.getTasksManager(mockConfig);
    expect(manager).toBeInstanceOf(GoogleTasksManager);
  });

  it('should return a TodoistManager instance', () => {
    (mockConfig as any).task_service = 'Todoist';
    const manager = factory.getTasksManager(mockConfig);
    expect(manager).toBeInstanceOf(TodoistManager);
  });

  it('should throw an error for an unknown task service', () => {
    (mockConfig as any).task_service = 'Unknown Service';
    expect(() => factory.getTasksManager(mockConfig)).toThrow('Unknown task service: Unknown Service');
  });
});
