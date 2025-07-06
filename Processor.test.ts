import { Mocks } from './Mocks';
import { Processor } from './Processor';
import { AIAnalyzer } from './AIAnalyzer';
import { TasksManagerFactory } from './TasksManagerFactory';
import { Config } from './Config';

jest.mock('./AIAnalyzer');
jest.mock('./TasksManagerFactory');
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
    (AIAnalyzer.generatePlans as jest.Mock).mockClear();
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
      task: { title: 'Test Task', notes: 'Test Notes' },
      confidence: {
        score: 90,
        reasoning: 'Test reasoning',
        not_higher_reasoning: 'Test not higher reasoning',
        not_lower_reasoning: 'Test not lower reasoning',
      },
    };
    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([mockPlan]);
    const mockTasksManager = {
      findCheckpoint: jest.fn().mockReturnValue(null),
      upsertTask: jest.fn().mockReturnValue(true),
    };
    (TasksManagerFactory.getTasksManager as jest.Mock).mockReturnValue(mockTasksManager);

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
    expect(mockTasksManager.upsertTask).toHaveBeenCalled();
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
      task: { title: '', notes: 'Test Notes' },
      confidence: {
        score: 90,
        reasoning: 'Test reasoning',
        not_higher_reasoning: 'Test not higher reasoning',
        not_lower_reasoning: 'Test not lower reasoning',
      },
    };
    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([mockPlan]);
    const mockTasksManager = {
      findCheckpoint: jest.fn().mockReturnValue(null),
      upsertTask: jest.fn(),
    };
    (TasksManagerFactory.getTasksManager as jest.Mock).mockReturnValue(mockTasksManager);

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
    expect(mockTasksManager.upsertTask).toHaveBeenCalledWith(
        mockThread,
        { title: 'Fallback Subject', notes: `Test Notes
--- 
**Confidence Score:** 90/100
**Reasoning:** Test reasoning
**Why not higher:** Test not higher reasoning
**Why not lower:** Test not lower reasoning
` },
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

    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([null]);
    const mockTasksManager = {
      findCheckpoint: jest.fn().mockReturnValue(null),
      upsertTask: jest.fn(),
    };
    (TasksManagerFactory.getTasksManager as jest.Mock).mockReturnValue(mockTasksManager);

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
    expect(mockTasksManager.upsertTask).not.toHaveBeenCalled();
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
      confidence: {
        score: 0,
        reasoning: 'Non-actionable email',
        not_higher_reasoning: 'No clear action required',
        not_lower_reasoning: 'Email was processed successfully',
      },
    };
    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([mockPlan]);
    const mockTasksManager = {
      findCheckpoint: jest.fn().mockReturnValue(null),
      upsertTask: jest.fn(),
    };
    (TasksManagerFactory.getTasksManager as jest.Mock).mockReturnValue(mockTasksManager);

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
    expect(mockTasksManager.upsertTask).not.toHaveBeenCalled();
    expect(mockThread.markUnread).toHaveBeenCalled();
  });

  it('should add confidence score to task notes', () => {
    // Setup
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-1',
      getFirstMessageSubject: () => 'Test Subject',
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

    const mockPlan = {
      task: { title: 'Test Task', notes: 'Initial notes.' },
      confidence: {
        score: 90,
        reasoning: 'Clear request.',
        not_higher_reasoning: 'No deadline.',
        not_lower_reasoning: 'High priority.',
      },
    };
    (AIAnalyzer.generatePlans as jest.Mock).mockReturnValue([mockPlan]);
    const mockTasksManager = {
      findCheckpoint: jest.fn().mockReturnValue(null),
      upsertTask: jest.fn().mockReturnValue(true),
    };
    (TasksManagerFactory.getTasksManager as jest.Mock).mockReturnValue(mockTasksManager);

    const unprocessedLabel = { getThreads: () => [mockThread] };
    global.GmailApp = {
      getUserLabelByName: jest.fn(() => unprocessedLabel as any),
    } as any;

    // Execute
    Processor.processAllUnprocessedThreads();

    // Verify
    const expectedNotes = `
--- 
**Confidence Score:** 90/100
**Reasoning:** Clear request.
**Why not higher:** No deadline.
**Why not lower:** High priority.
`;
    expect(mockTasksManager.upsertTask).toHaveBeenCalledWith(
      mockThread,
      {
        title: 'Test Task',
        notes: `Initial notes.${expectedNotes}`,
      },
      mockConfig
    );
  });
});