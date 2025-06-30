import './jest.setup.js';
import { Mocks } from './Mocks';
import { GoogleTasksManager } from './GoogleTasksManager';
import { Config } from './Config';

jest.mock('./Config');

describe('GoogleTasksManager Tests', () => {
  const mockConfig = {
    default_task_list_name: 'My Tasks',
  } as Config;

  const mockThread = Mocks.getMockThread({
    getId: () => 'thread-123',
    getPermalink: () => 'https://mail.google.com/mail/u/0/#inbox/thread-123',
  });

  let tasksManager: GoogleTasksManager;

  beforeEach(() => {
    tasksManager = new GoogleTasksManager();
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);

    // Mock global.Tasks methods directly
    global.Tasks = {
      Tasklists: {
        list: jest.fn() as jest.Mock,
        get: jest.fn() as jest.Mock,
        insert: jest.fn() as jest.Mock,
        patch: jest.fn() as jest.Mock,
        remove: jest.fn() as jest.Mock,
        update: jest.fn() as jest.Mock,
      },
      Tasks: {
        list: jest.fn() as jest.Mock,
        patch: jest.fn() as jest.Mock,
        insert: jest.fn() as jest.Mock,
        clear: jest.fn() as jest.Mock,
        get: jest.fn() as jest.Mock,
        move: jest.fn() as jest.Mock,
        remove: jest.fn() as jest.Mock,
        update: jest.fn() as jest.Mock,
      },
      newTask: jest.fn() as jest.Mock,
      newTaskLinks: jest.fn() as jest.Mock,
      newTaskList: jest.fn() as jest.Mock,
    } as any; // Cast to any to bypass strict type checking for mocking global objects

    // Clear mocks before each test
    (global.Tasks.Tasklists.list as jest.Mock).mockClear();
    (global.Tasks.Tasks.list as jest.Mock).mockClear();
    (global.Tasks.Tasks.patch as jest.Mock).mockClear();
    (global.Tasks.Tasks.insert as jest.Mock).mockClear();

    // Default mock implementation for Tasklists.list
    (global.Tasks.Tasklists.list as jest.Mock).mockReturnValue({
      items: [Mocks.getMockTaskList({ title: 'My Tasks', id: 'task-list-id-123' })],
    });
  });

  it('should find the latest checkpoint from completed tasks', () => {
    const tasks = [
      Mocks.getMockTask({ notes: 'gmail_thread_id: thread-123', completed: '2024-01-01T12:00:00.000Z' }),
      Mocks.getMockTask({ notes: 'gmail_thread_id: thread-123', completed: '2024-01-02T12:00:00.000Z' }), // latest
      Mocks.getMockTask({ notes: 'gmail_thread_id: thread-456', completed: '2024-01-03T12:00:00.000Z' }),
    ];
    (global.Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: tasks });

    const checkpoint = tasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2024-01-02T12:00:00.000Z');
  });

  it('should return null if no completed task is found', () => {
    (global.Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [] });
    const checkpoint = tasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe(null);
  });

  it('should create a new task if none exists', () => {
    (global.Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [] });
    (global.Tasks.Tasklists.list as jest.Mock).mockReturnValue({
      items: [Mocks.getMockTaskList({ title: 'My Tasks', id: 'task-list-id-123' })],
    });

    tasksManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);

    expect(global.Tasks.Tasks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Task Title',
        notes: 'New Notes\n\nLink to Email:\nhttps://mail.google.com/mail/u/0/#inbox/thread-123\n\n---\nmanaged_by: gmail-automata\ngmail_thread_id: thread-123',
      }),
      'task-list-id-123'
    );
  });

  it('should update an existing task if found', () => {
    const existingTask = Mocks.getMockTask({ id: 'task-abc', notes: 'gmail_thread_id: thread-123' });
    (global.Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [existingTask] });
    (global.Tasks.Tasklists.list as jest.Mock).mockReturnValue({
      items: [Mocks.getMockTaskList({ title: 'My Tasks', id: 'task-list-id-123' })],
    });

    tasksManager.upsertTask(mockThread, { title: 'Updated Title', notes: 'Updated Notes' }, mockConfig);

    expect(global.Tasks.Tasks.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Title',
      }),
      'task-list-id-123',
      'task-abc'
    );
  });

  it('should get task list ID by name and cache it', () => {
    const taskLists = [
      Mocks.getMockTaskList({ title: 'Other Tasks', id: 'other-id' }),
      Mocks.getMockTaskList({ title: 'My Tasks', id: 'my-tasks-id' }),
    ];
    (global.Tasks.Tasklists.list as jest.Mock).mockReturnValue({ items: taskLists });

    const taskListId = (tasksManager as any).getTaskListId(mockConfig);
    expect(taskListId).toBe('my-tasks-id');
    expect((GoogleTasksManager as any).taskListIdCache).toBe('my-tasks-id');

    // Second call should use cache, not API
    (global.Tasks.Tasklists.list as jest.Mock).mockClear();
    const cachedId = (tasksManager as any).getTaskListId(mockConfig);
    expect(cachedId).toBe('my-tasks-id');
    expect(global.Tasks.Tasklists.list).not.toHaveBeenCalled();
  });

  it('should throw an error if task list is not found', () => {
    (global.Tasks.Tasklists.list as jest.Mock).mockReturnValue({ items: [] });
    expect(() => (tasksManager as any).getTaskListId(mockConfig)).toThrow("Task list with name 'My Tasks' not found.");
  });

  it('should handle API errors gracefully', () => {
    (global.Tasks.Tasks.list as jest.Mock).mockImplementation(() => {
      throw new Error('API Error');
    });
    const checkpoint = tasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe(null);
    tasksManager.upsertTask(mockThread, { title: 'New Task Title', notes: 'New Notes' }, mockConfig);
    // No exception should be thrown
  });
});