import { TasksManager } from './TasksManager';
import { Config } from './Config';
import Mocks from './Mocks';

describe('TasksManager', () => {
  const mockConfig = {
    default_task_list_name: 'My Tasks',
  } as Config;

  const mockThread = Mocks.getMockThread({
    getId: () => 'thread-123',
    getPermalink: () => 'https://mail.google.com/mail/u/0/#inbox/thread-123',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    TasksManager['taskListIdCache'] = null;
  });

  it('should find the latest checkpoint from completed tasks', () => {
    const tasks = [
      Mocks.getMockTask({ notes: 'gmail_thread_id: thread-123', completed: '2024-01-01T12:00:00.000Z' }),
      Mocks.getMockTask({ notes: 'gmail_thread_id: thread-123', completed: '2024-01-02T12:00:00.000Z' }), // latest
      Mocks.getMockTask({ notes: 'gmail_thread_id: thread-456', completed: '2024-01-03T12:00:00.000Z' }),
    ];
    (Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: tasks });

    const checkpoint = TasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe('2024-01-02T12:00:00.000Z');
  });

  it('should return null if no completed task is found', () => {
    (Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [] });
    const checkpoint = TasksManager.findCheckpoint('thread-123', mockConfig);
    expect(checkpoint).toBe(null);
  });

  it('should create a new task if none exists', () => {
    (Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [] }); // No existing tasks
    (Tasks.Tasklists.list as jest.Mock).mockReturnValue({ items: [Mocks.getMockTaskList({ title: 'My Tasks', id: 'my-tasks-id' })] });

    TasksManager.upsertTask(mockThread, { is_required: true, title: 'New Task Title', notes: 'New Notes' }, mockConfig);

    expect(Tasks.Tasks.insert).toHaveBeenCalled();
    const insertCall = (Tasks.Tasks.insert as jest.Mock).mock.calls[0];
    expect(insertCall[1]).toBe('my-tasks-id');
    expect(insertCall[0].title).toBe('New Task Title');
    expect(insertCall[0].notes).toContain('gmail_thread_id: thread-123');
  });

  it('should update an existing task if found', () => {
    const existingTask = Mocks.getMockTask({ id: 'task-abc', notes: 'gmail_thread_id: thread-123' });
    (Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [existingTask] });
    (Tasks.Tasklists.list as jest.Mock).mockReturnValue({ items: [Mocks.getMockTaskList({ title: 'My Tasks', id: 'my-tasks-id' })] });

    TasksManager.upsertTask(mockThread, { is_required: true, title: 'Updated Title', notes: 'Updated Notes' }, mockConfig);

    expect(Tasks.Tasks.patch).toHaveBeenCalled();
    const patchCall = (Tasks.Tasks.patch as jest.Mock).mock.calls[0];
    expect(patchCall[2]).toBe('task-abc');
    expect(patchCall[0].title).toBe('Updated Title');
  });

  it('should get task list ID by name and cache it', () => {
    const taskLists = [
        Mocks.getMockTaskList({ title: 'Other Tasks', id: 'other-id'}),
        Mocks.getMockTaskList({ title: 'My Tasks', id: 'my-tasks-id'}),
    ];
    (Tasks.Tasklists.list as jest.Mock).mockReturnValue({ items: taskLists });

    const taskListId = TasksManager['getTaskListId'](mockConfig);
    expect(taskListId).toBe('my-tasks-id');
    expect(TasksManager['taskListIdCache']).toBe('my-tasks-id');

    // Second call should use cache, not API
    (Tasks.Tasklists.list as jest.Mock).mockClear();
    const cachedId = TasksManager['getTaskListId'](mockConfig);
    expect(cachedId).toBe('my-tasks-id');
    expect(Tasks.Tasklists.list).not.toHaveBeenCalled();
  });

  it('should throw an error if task list is not found', () => {
    (Tasks.Tasklists.list as jest.Mock).mockReturnValue({ items: [] });
    expect(() => TasksManager['getTaskListId'](mockConfig)).toThrow("Task list with name 'My Tasks' not found.");
  });
});
