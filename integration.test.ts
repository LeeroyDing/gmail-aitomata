import { Mocks } from "./Mocks";
import { Processor } from "./Processor";
import { Config } from "./Config";

jest.mock('./Config');

// Mock external services
global.UrlFetchApp = Mocks.createMockUrlFetchApp();
global.Tasks = Mocks.createMockTasks();
global.GmailApp = {
  getUserLabelByName: jest.fn(),
} as any;
global.SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(() => ({
    getSheetByName: jest.fn((name: string) => {
      if (name === 'statistics') { // Corrected sheet name
        return {
          appendRow: jest.fn(),
        };
      }
      if (name === 'AI_Context') {
        return {
          getDataRange: () => ({
            getDisplayValues: () => [
              ['Category', 'Guideline'],
              ['My Role', 'Project Manager'],
            ],
          }),
        };
      }
      return null;
    }),
  })),
} as any;
global.LockService = {
  getScriptLock: jest.fn(() => ({
    tryLock: jest.fn(() => true),
    releaseLock: jest.fn(),
  })),
} as any;
global.Logger = {
  log: jest.fn(),
} as any;

describe('Integration Tests', () => {
  const mockConfig = {
    GEMINI_API_KEY: 'test-api-key',
    gemini_model: 'gemini-2.5-flash',
    unprocessed_label: 'unprocessed',
    processed_label: 'processed',
    processing_failed_label: 'error',
    default_task_list_name: 'My Tasks',
    task_service: 'Google Tasks',
  } as Config;

  beforeEach(() => {
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);
    (global.Tasks.Tasklists.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks.get as jest.Mock) = jest.fn();
    jest.clearAllMocks();
  });

  const mockAIResponse = (plans: any[]) => {
    (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(
      Mocks.getMockUrlFetchResponse(200, JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(plans) }] } }],
      }))
    );
  };

  it('should create a task for a new actionable email', () => {
    const mockThread = Mocks.getMockThread({});
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue({ getThreads: () => [mockThread] });
    (global.Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [] });
    mockAIResponse([
      { action: 'CREATE_TASK', task: { title: 'New Task' } },
    ]);

    Processor.processAllUnprocessedThreads();

    expect(global.Tasks.Tasks.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Task' }), 'tasklist-1');
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should update an existing, incomplete task', () => {
    const mockThread = Mocks.getMockThread({ getId: () => 'thread-incomplete' });
    const existingTask = Mocks.createMockTask({ id: 'task-incomplete', notes: 'gmail_thread_id: thread-incomplete', status: 'needsAction' });
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue({ getThreads: () => [mockThread] });
    (global.Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [existingTask] });
    mockAIResponse([
      { action: 'UPDATE_TASK', task: { title: 'Updated Title' } },
    ]);

    Processor.processAllUnprocessedThreads();

    expect(global.Tasks.Tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-incomplete', title: 'Updated Title' }),
      'tasklist-1',
      'task-incomplete'
    );
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should reopen and update a completed task', () => {
    const mockThread = Mocks.getMockThread({ getId: () => 'thread-completed' });
    const existingTask = Mocks.createMockTask({ id: 'task-completed', notes: 'gmail_thread_id: thread-completed', status: 'completed' });
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue({ getThreads: () => [mockThread] });
    (global.Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [existingTask] });
    (global.Tasks.Tasks.get as jest.Mock).mockReturnValue(existingTask);
    mockAIResponse([
      { action: 'REOPEN_AND_UPDATE_TASK', task: { title: 'Reopened Task' } },
    ]);

    Processor.processAllUnprocessedThreads();

    // First update is to reopen (status change)
    expect(global.Tasks.Tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-completed', status: 'needsAction' }),
      'tasklist-1',
      'task-completed'
    );
    
    // Second update is for the content
    expect(global.Tasks.Tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-completed', title: 'Reopened Task' }),
      'tasklist-1',
      'task-completed'
    );
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should do nothing for a minor follow-up', () => {
    const mockThread = Mocks.getMockThread({});
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue({ getThreads: () => [mockThread] });
    mockAIResponse([
      { action: 'DO_NOTHING' },
    ]);

    Processor.processAllUnprocessedThreads();

    expect(global.Tasks.Tasks.insert).not.toHaveBeenCalled();
    expect(global.Tasks.Tasks.update).not.toHaveBeenCalled();
    expect(mockThread.markRead).not.toHaveBeenCalled();
    expect(mockThread.removeLabel).toHaveBeenCalled(); // Should still be processed
  });

  it('should correctly process a batch of threads with mixed scenarios', () => {
    const thread1 = Mocks.getMockThread({ getId: () => 'batch-1' }); // New
    const thread2 = Mocks.getMockThread({ getId: () => 'batch-2' }); // Update
    const thread3 = Mocks.getMockThread({ getId: () => 'batch-3' }); // Reopen
    const thread4 = Mocks.getMockThread({ getId: () => 'batch-4' }); // Ignore

    const task2 = Mocks.createMockTask({ id: 'task-2', notes: 'gmail_thread_id: batch-2', status: 'needsAction' });
    const task3 = Mocks.createMockTask({ id: 'task-3', notes: 'gmail_thread_id: batch-3', status: 'completed' });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue({ getThreads: () => [thread1, thread2, thread3, thread4] });
    
    // Mock findTask logic
    (global.Tasks.Tasks.list as jest.Mock).mockReturnValue({ items: [task2, task3] });
    (global.Tasks.Tasks.get as jest.Mock).mockReturnValue(task3);

    mockAIResponse([
      { action: 'CREATE_TASK', task: { title: 'New' } },
      { action: 'UPDATE_TASK', task: { title: 'Updated' } },
      { action: 'REOPEN_AND_UPDATE_TASK', task: { title: 'Reopened' } },
      { action: 'DO_NOTHING' },
    ]);

    Processor.processAllUnprocessedThreads();

    expect(global.Tasks.Tasks.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'New' }), 'tasklist-1');
    expect(global.Tasks.Tasks.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-2', title: 'Updated' }), 'tasklist-1', 'task-2');
    expect(global.Tasks.Tasks.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-3', status: 'needsAction' }), 'tasklist-1', 'task-3');
    expect(global.Tasks.Tasks.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-3', title: 'Reopened' }), 'tasklist-1', 'task-3');
    expect(global.Tasks.Tasks.insert).toHaveBeenCalledTimes(1);
    expect(global.Tasks.Tasks.update).toHaveBeenCalledTimes(3); // 1 for update, 2 for reopen
  });
});