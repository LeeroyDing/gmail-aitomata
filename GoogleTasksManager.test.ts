
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
    const task = { title: 'Test Task', notes: 'Test Notes', due_date: '2025-12-31', priority: 1 };
    const result = manager.upsertTask(thread, task, mockConfig, "https://mail.google.com/mail/u/0/#inbox/thread-id");
    expect(result).toBe(true);
    expect(global.Tasks?.Tasks?.insert).toHaveBeenCalled();
  });

  it('should return null when no tasks exist', () => {
    global.Tasks = Mocks.createMockTasks([]);
    const checkpoint = manager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBeNull();
  });

  it('should return the updated timestamp of the most recent active task', () => {
    const activeTask = Mocks.createMockTask({ updated: '2025-07-08T10:00:00Z', notes: 'gmail_thread_id: thread-123' });
    global.Tasks = Mocks.createMockTasks([activeTask]);
    const checkpoint = manager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2025-07-08T10:00:00Z');
  });

  it('should return the updated timestamp of the most recent completed task', () => {
    const completedTask = Mocks.createMockTask({
      updated: '2025-07-08T11:00:00Z',
      status: 'completed',
      notes: 'gmail_thread_id: thread-123',
    });
    global.Tasks = Mocks.createMockTasks([completedTask]);
    const checkpoint = manager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2025-07-08T11:00:00Z');
  });

  it('should return the active task timestamp when it is newer', () => {
    const activeTask = Mocks.createMockTask({ updated: '2025-07-08T12:00:00Z', notes: 'gmail_thread_id: thread-123' });
    const completedTask = Mocks.createMockTask({
      updated: '2025-07-08T11:00:00Z',
      status: 'completed',
      notes: 'gmail_thread_id: thread-123',
    });
    global.Tasks = Mocks.createMockTasks([activeTask, completedTask]);
    const checkpoint = manager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2025-07-08T12:00:00Z');
  });

  it('should return the completed task timestamp when it is newer', () => {
    const activeTask = Mocks.createMockTask({ updated: '2025-07-08T10:00:00Z', notes: 'gmail_thread_id: thread-123' });
    const completedTask = Mocks.createMockTask({
      updated: '2025-07-08T11:00:00Z',
      status: 'completed',
      notes: 'gmail_thread_id: thread-123',
    });
    global.Tasks = Mocks.createMockTasks([activeTask, completedTask]);
    const checkpoint = manager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2025-07-08T11:00:00Z');
  });
});
