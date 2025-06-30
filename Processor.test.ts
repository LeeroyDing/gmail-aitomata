import { Mocks } from './Mocks';
import { Processor } from './Processor';
import { AIAnalyzer } from './AIAnalyzer';
import { TasksManagerFactory } from './TasksManagerFactory';
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';
import { Config } from './Config';

jest.mock('./AIAnalyzer');
jest.mock('./TasksManagerFactory');
jest.mock('./GoogleTasksManager');
jest.mock('./TodoistManager');
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

describe('Processor Tests', () => {
  let mockGoogleTasksManager: jest.Mocked<GoogleTasksManager>;
  let mockTodoistManager: jest.Mocked<TodoistManager>;

  beforeEach(() => {
    // Reset mocks before each test
    (AIAnalyzer.generatePlan as jest.Mock).mockClear();
    (TasksManagerFactory.getTasksManager as jest.Mock).mockClear();
    (Config.getConfig as jest.Mock).mockClear();

    mockGoogleTasksManager = new (GoogleTasksManager as any)();
    mockTodoistManager = new (TodoistManager as any)();
  });

  it('should process a simple thread correctly with Google Tasks', () => {
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
      task_service: 'Google Tasks',
      unprocessed_label: 'unprocessed',
      processed_label: 'processed',
      max_threads: 50,
    };
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);
    (TasksManagerFactory.getTasksManager as jest.Mock).mockReturnValue(mockGoogleTasksManager);

    const mockPlan = {
      action: { move_to: 'ARCHIVE', mark_read: true },
      task: { title: 'Test Task', notes: 'Test Notes' },
    };
    (AIAnalyzer.generatePlan as jest.Mock).mockReturnValue(mockPlan);
    (mockGoogleTasksManager.findCheckpoint as jest.Mock).mockReturnValue(null);

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
    expect(mockGoogleTasksManager.upsertTask).toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalled();
  });

  it('should process a simple thread correctly with Todoist', () => {
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
      task_service: 'Todoist',
      unprocessed_label: 'unprocessed',
      processed_label: 'processed',
      max_threads: 50,
    };
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);
    (TasksManagerFactory.getTasksManager as jest.Mock).mockReturnValue(mockTodoistManager);

    const mockPlan = {
      action: { move_to: 'ARCHIVE', mark_read: true },
      task: { title: 'Test Task', notes: 'Test Notes' },
    };
    (AIAnalyzer.generatePlan as jest.Mock).mockReturnValue(mockPlan);
    (mockTodoistManager.findCheckpoint as jest.Mock).mockReturnValue(null);

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
    expect(mockTodoistManager.upsertTask).toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalled();
  });
});
