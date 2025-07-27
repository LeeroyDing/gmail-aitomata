
import { Mocks } from './Mocks';
import { Processor } from './Processor';
import { AIAnalyzer } from './AIAnalyzer';

import { Config } from './Config';
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';

jest.mock('./AIAnalyzer');
jest.mock('./GoogleTasksManager');
jest.mock('./TodoistManager');
jest.mock('./Config');

global.Logger = {
  log: jest.fn(),
  clear: jest.fn(),
  getLog: jest.fn(),
};

global.LockService = {
  getScriptLock: jest.fn(() => ({
    tryLock: jest.fn(() => true),
    releaseLock: jest.fn(),
  })),
} as any;

describe('Processor Tests', () => {
  
  let mockTasksManager: any;
  let mockConfig: Partial<Config>;

  beforeEach(() => {
    // Reset mocks before each test
    (AIAnalyzer.generatePlans as jest.Mock).mockClear();
    (Config.getConfig as jest.Mock).mockClear();

    mockConfig = {
      unprocessed_label: 'unprocessed',
      processed_label: 'processed',
      processing_failed_label: 'error',
      max_threads: 50,
      task_service: 'Google Tasks',
    };
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);

    mockTasksManager = {
      findTask: jest.fn().mockReturnValue(null),
      upsertTask: jest.fn().mockReturnValue(true),
      reopenTask: jest.fn().mockReturnValue(true),
    };

    (GoogleTasksManager as jest.Mock).mockImplementation(() => mockTasksManager);
    (TodoistManager as jest.Mock).mockImplementation(() => mockTasksManager);


    const unprocessedLabel = { getThreads: jest.fn().mockReturnValue([]) };
    const processedLabel = { getName: () => 'processed' };
    global.GmailApp = {
      getUserLabelByName: jest.fn((name: string) => {
        if (name === 'unprocessed') return unprocessedLabel as any;
        if (name === 'processed') return processedLabel as any;
        return { getName: () => name } as any;
      }),
    } as any;
  });

  it('should create a new task when action is CREATE_TASK', () => {
    const mockThread = Mocks.getMockThread({});
    (global.GmailApp.getUserLabelByName('unprocessed').getThreads as jest.Mock).mockReturnValue([mockThread]);

    const mockPlan = {
      action: 'CREATE_TASK',
      task: { title: 'New Task', notes: 'Notes' },
    };
    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([mockPlan]);

    Processor.processAllUnprocessedThreads();

    expect(mockTasksManager.upsertTask).toHaveBeenCalledWith(mockThread, mockPlan.task, expect.any(Object), expect.any(String));
    expect(mockThread.markRead).toHaveBeenCalled();
    expect(mockThread.removeLabel).toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalled();
  });

  it('should update a task when action is UPDATE_TASK', () => {
    const mockThread = Mocks.getMockThread({});
    (global.GmailApp.getUserLabelByName('unprocessed').getThreads as jest.Mock).mockReturnValue([mockThread]);
    mockTasksManager.findTask.mockReturnValue({ id: 'task-123' });

    const mockPlan = {
      action: 'UPDATE_TASK',
      task: { title: 'Updated Task', notes: 'Updated Notes' },
    };
    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([mockPlan]);

    Processor.processAllUnprocessedThreads();

    expect(mockTasksManager.upsertTask).toHaveBeenCalledWith(mockThread, mockPlan.task, expect.any(Object), expect.any(String));
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should reopen and update a task when action is REOPEN_AND_UPDATE_TASK', () => {
    const mockThread = Mocks.getMockThread({});
    (global.GmailApp.getUserLabelByName('unprocessed').getThreads as jest.Mock).mockReturnValue([mockThread]);
    mockTasksManager.findTask.mockReturnValue({ id: 'task-123' });

    const mockPlan = {
      action: 'REOPEN_AND_UPDATE_TASK',
      task: { title: 'Reopened Task', notes: 'Reopened Notes' },
    };
    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([mockPlan]);

    Processor.processAllUnprocessedThreads();

    expect(mockTasksManager.reopenTask).toHaveBeenCalledWith('task-123', expect.any(Object));
    expect(mockTasksManager.upsertTask).toHaveBeenCalledWith(mockThread, mockPlan.task, expect.any(Object), expect.any(String));
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should do nothing when action is DO_NOTHING', () => {
    const mockThread = Mocks.getMockThread({});
    (global.GmailApp.getUserLabelByName('unprocessed').getThreads as jest.Mock).mockReturnValue([mockThread]);

    const mockPlan = {
      action: 'DO_NOTHING',
    };
    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([mockPlan]);

    Processor.processAllUnprocessedThreads();

    expect(mockTasksManager.upsertTask).not.toHaveBeenCalled();
    expect(mockTasksManager.reopenTask).not.toHaveBeenCalled();
    expect(mockThread.markRead).not.toHaveBeenCalled();
    // It should still be marked as processed
    expect(mockThread.removeLabel).toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalled();
  });
});
