import { Mocks } from './Mocks';
import { Processor } from './Processor';
import { AIAnalyzer } from './AIAnalyzer';
import { TasksManager } from './TasksManager';
import { Config } from './Config';

jest.mock('./AIAnalyzer');
jest.mock('./TasksManager');
jest.mock('./Config');

global.SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(() => ({
    getSheetByName: jest.fn(() => ({
      appendRow: jest.fn(),
    })),
  })),
} as any;

global.Logger = {
  log: jest.fn(),
  clear: jest.fn(),
  getLog: jest.fn(),
};

global.LockService = {
  getScriptLock: jest.fn(() => ({
    tryLock: jest.fn(() => true),
    releaseLock: jest.fn(),
    hasLock: jest.fn(() => false),
    waitLock: jest.fn(),
  })),
  getDocumentLock: jest.fn(() => ({
    tryLock: jest.fn(() => true),
    releaseLock: jest.fn(),
    hasLock: jest.fn(() => false),
    waitLock: jest.fn(),
  })),
  getUserLock: jest.fn(() => ({
    tryLock: jest.fn(() => true),
    releaseLock: jest.fn(),
    hasLock: jest.fn(() => false),
    waitLock: jest.fn(),
  })),
};

describe('Processor Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (AIAnalyzer.generatePlan as jest.Mock).mockClear();
    (TasksManager.findCheckpoint as jest.Mock).mockClear();
    (TasksManager.upsertTask as jest.Mock).mockClear();
    (Config.getConfig as jest.Mock).mockClear();
  });

  it('should process a simple thread correctly', () => {
    // Setup
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-1',
      getFirstMessageSubject: () => 'Test Subject',
      getMessages: () => [Mocks.getMockMessage({ getDate: () => new Date() })],
      removeLabel: jest.fn(),
      addLabel: jest.fn(),
      moveToArchive: jest.fn(),
    });

    const mockConfig = {
      unprocessed_label: 'unprocessed',
      processed_label: 'processed',
      processing_failed_label: 'error',
      max_threads: 50,
    };
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);

    const mockPlan = {
      action: { mark_read: true },
      task: { title: 'Test Task', notes: 'Test Notes' },
    };
    (AIAnalyzer.generatePlan as jest.Mock).mockReturnValue(mockPlan);
    (TasksManager.findCheckpoint as jest.Mock).mockReturnValue(null);
    (TasksManager.upsertTask as jest.Mock).mockReturnValue(true);

    const unprocessedLabel = { getThreads: () => [mockThread] };
    const processedLabel = { getName: () => 'processed' };
    global.GmailApp = {
      getUserLabelByName: jest.fn((name: string) => {
        if (name === 'unprocessed') {
          return unprocessedLabel as any;
        }
        if (name === 'processed') {
            return processedLabel as any;
        }
        return {
          getName: () => name,
        } as any;
      }),
    } as any;

    // Execute
    Processor.processAllUnprocessedThreads();

    // Verify
    expect(TasksManager.upsertTask).toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalled();
  });

  it('should use the email subject as a fallback title', () => {
    // Setup
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-1',
      getFirstMessageSubject: () => 'Fallback Subject',
      getMessages: () => [Mocks.getMockMessage({ getDate: () => new Date() })],
      removeLabel: jest.fn(),
      addLabel: jest.fn(),
      moveToArchive: jest.fn(),
    });

    const mockConfig = {
      unprocessed_label: 'unprocessed',
      processed_label: 'processed',
      processing_failed_label: 'error',
      max_threads: 50,
    };
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);

    const mockPlan = {
      action: { mark_read: true },
      task: { title: '', notes: 'Test Notes' },
    };
    (AIAnalyzer.generatePlan as jest.Mock).mockReturnValue(mockPlan);
    (TasksManager.findCheckpoint as jest.Mock).mockReturnValue(null);

    const unprocessedLabel = { getThreads: () => [mockThread] };
    const processedLabel = { getName: () => 'processed' };
    global.GmailApp = {
        getUserLabelByName: jest.fn((name: string) => {
            if (name === 'unprocessed') {
                return unprocessedLabel as any;
            }
            if (name === 'processed') {
                return processedLabel as any;
            }
            return {
                getName: () => name,
            } as any;
        }),
    } as any;

    // Execute
    Processor.processAllUnprocessedThreads();

    // Verify
    expect(TasksManager.upsertTask).toHaveBeenCalledWith(
        mockThread,
        { title: 'Fallback Subject', notes: 'Test Notes' },
        mockConfig
    );
  });

  it('should not process the email if the AI call fails', () => {
    // Setup
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-3',
      getFirstMessageSubject: () => 'AI Fail Subject',
      getMessages: () => [Mocks.getMockMessage({ getDate: () => new Date() })],
      removeLabel: jest.fn(),
      addLabel: jest.fn(),
    });

    const mockConfig = {
      unprocessed_label: 'unprocessed',
      processed_label: 'processed',
      max_threads: 50,
    };
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);

    (AIAnalyzer.generatePlan as jest.Mock).mockReturnValue(null);
    (TasksManager.findCheckpoint as jest.Mock).mockReturnValue(null);

    const unprocessedLabel = { getThreads: () => [mockThread] };
    global.GmailApp = {
      getUserLabelByName: jest.fn((name: string) => {
        if (name === 'unprocessed') return unprocessedLabel as any;
        return { getName: () => name } as any;
      }),
    } as any;

    // Execute
    Processor.processAllUnprocessedThreads();

    // Verify
    expect(TasksManager.upsertTask).not.toHaveBeenCalled();
    expect(mockThread.removeLabel).not.toHaveBeenCalled();
    expect(mockThread.addLabel).not.toHaveBeenCalled();
  });

  it('should not create a task and mark as unread if the email is not actionable', () => {
    // Setup
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-2',
      getFirstMessageSubject: () => 'Non-Actionable Email',
      getMessages: () => [Mocks.getMockMessage({ getDate: () => new Date() })],
      removeLabel: jest.fn(),
      addLabel: jest.fn(),
      markUnread: jest.fn(),
      moveToArchive: jest.fn(),
    });

    const mockConfig = {
      unprocessed_label: 'unprocessed',
      processed_label: 'processed',
      max_threads: 50,
    };
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);

    const mockPlan = {
      action: { mark_read: true }, // This will be overridden
    };
    (AIAnalyzer.generatePlan as jest.Mock).mockReturnValue(mockPlan);
    (TasksManager.findCheckpoint as jest.Mock).mockReturnValue(null);

    const unprocessedLabel = { getThreads: () => [mockThread] };
    const processedLabel = { getName: () => 'processed' };
    global.GmailApp = {
      getUserLabelByName: jest.fn((name: string) => {
        if (name === 'unprocessed') return unprocessedLabel as any;
        if (name === 'processed') return processedLabel as any;
        return { getName: () => name } as any;
      }),
    } as any;

    // Execute
    Processor.processAllUnprocessedThreads();

    // Verify
    expect(TasksManager.upsertTask).not.toHaveBeenCalled();
    expect(mockThread.markUnread).toHaveBeenCalled();
  });
});
