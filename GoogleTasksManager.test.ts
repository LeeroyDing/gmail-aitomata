
import { Mocks } from './Mocks';
import { GoogleTasksManager } from './GoogleTasksManager';
import { Config } from './Config';

describe('GoogleTasksManager', () => {
  let manager: GoogleTasksManager;
  let mockConfig: Config;

  beforeEach(() => {
    manager = new GoogleTasksManager();
    mockConfig = Mocks.createMockConfig();
    global.Tasks = Mocks.createMockTasks();
  });

  it('should create a new task', () => {
    const thread = Mocks.getMockThread({ getFirstMessageSubject: () => 'Test Thread' });
    const task = { title: 'Test Task', notes: 'Test Notes' };
    const result = manager.upsertTask(thread, task, mockConfig);
    expect(result).toBe(true);
    if (global.Tasks && global.Tasks.Tasks) {
      expect(global.Tasks.Tasks.insert).toHaveBeenCalled();
    }
  });

  it('should find a checkpoint', () => {
    const checkpoint = manager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBeNull();
  });
});
