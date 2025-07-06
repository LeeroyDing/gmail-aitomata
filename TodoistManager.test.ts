
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
