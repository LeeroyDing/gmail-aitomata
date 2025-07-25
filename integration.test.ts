import { Mocks } from './Mocks';
import { Processor } from './Processor';
import { Config } from './Config';
import { AIAnalyzer } from './AIAnalyzer';
import { TasksManagerFactory } from './TasksManagerFactory';

jest.mock('./Config');

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
    jest.clearAllMocks();
  });

  it('should create a task for a new actionable email', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-1',
      getFirstMessageSubject: () => 'Actionable Email',
      getPermalink: () => 'https://mail.google.com/mail/u/0/#inbox/thread-1',
      getMessages: () => [
        Mocks.getMockMessage({
          getDate: () => new Date(),
          getPlainBody: () => 'This is an actionable email.',
        }),
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    const mockSheet = Mocks.getMockSheet([
      ['Category', 'Guideline'],
      ['My Role', 'Project Manager'],
    ]);

    (global.SpreadsheetApp.getActiveSpreadsheet as jest.Mock).mockReturnValue(
      Mocks.getMockSpreadsheet({ 'AI_Context': mockSheet })
    );
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [] });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        task: {
          title: 'Follow up on actionable email',
          notes: 'This is a task for an actionable email.',
        },
        confidence: {
          score: 90,
          reasoning: 'The email is actionable.',
          not_higher_reasoning: 'N/A',
          not_lower_reasoning: 'N/A',
        },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Follow up on actionable email',
      }),
      'tasklist-1'
    );
    expect(mockThread.addLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.removeLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should ignore a new non-actionable email', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-2',
      getFirstMessageSubject: () => 'Non-Actionable Email',
      getMessages: () => [
        Mocks.getMockMessage({
          getDate: () => new Date(),
          getPlainBody: () => 'This is a non-actionable email.',
        }),
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [] });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        confidence: {
          score: 10,
          reasoning: 'The email is not actionable.',
          not_higher_reasoning: 'N/A',
          not_lower_reasoning: 'N/A',
        },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.insert).not.toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.removeLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.markRead).not.toHaveBeenCalled();
    expect(mockThread.markUnread).toHaveBeenCalled();
  });

  it('should create one task for a thread with multiple new messages', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-3',
      getFirstMessageSubject: () => 'Multiple Messages',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date() }),
        Mocks.getMockMessage({ getDate: () => new Date() }),
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [] });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        task: {
          title: 'Follow up on multiple messages',
          notes: 'This is a task for a thread with multiple messages.',
        },
        confidence: {
          score: 90,
          reasoning: 'The thread is actionable.',
          not_higher_reasoning: 'N/A',
          not_lower_reasoning: 'N/A',
        },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.insert).toHaveBeenCalledTimes(1);
    expect(mockThread.addLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.removeLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should remain non-actionable on follow-up', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-4',
      getFirstMessageSubject: () => 'Non-Actionable Follow-up',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date(Date.now() - 60000) }), // 1 minute ago
        Mocks.getMockMessage({ getDate: () => new Date() }), // now
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [] });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        confidence: {
          score: 10,
          reasoning: 'The thread is not actionable.',
          not_higher_reasoning: 'N/A',
          not_lower_reasoning: 'N/A',
        },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.insert).not.toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.removeLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.markRead).not.toHaveBeenCalled();
    expect(mockThread.markUnread).toHaveBeenCalled();
  });

  it('should become actionable on follow-up', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-5',
      getFirstMessageSubject: () => 'Actionable Follow-up',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date(Date.now() - 60000) }), // 1 minute ago
        Mocks.getMockMessage({ getDate: () => new Date() }), // now
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [] });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        task: {
          title: 'Follow up on actionable follow-up',
          notes: 'This is a task for an actionable follow-up.',
        },
        confidence: {
          score: 90,
          reasoning: 'The thread is now actionable.',
          not_higher_reasoning: 'N/A',
          not_lower_reasoning: 'N/A',
        },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.insert).toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.removeLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should reopen and update an existing task on substantial follow-up', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-6',
      getFirstMessageSubject: () => 'Substantial Follow-up',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date(Date.now() - 60000) }), // 1 minute ago
        Mocks.getMockMessage({ getDate: () => new Date() }), // now
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    const existingTask = Mocks.createMockTask({
      id: 'task-1',
      title: 'Initial Task',
      notes: 'gmail_thread_id: thread-6',
    });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [existingTask] });

    const reopenSpy = jest.spyOn(AIAnalyzer, 'shouldReopenTask').mockReturnValue(true);
    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        task: {
          title: 'Updated Task Title',
          notes: 'Updated task notes.',
        },
        confidence: {
          score: 95,
          reasoning: 'The follow-up is substantial.',
          not_higher_reasoning: 'N/A',
          not_lower_reasoning: 'N/A',
        },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(reopenSpy).toHaveBeenCalled();
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-1',
        title: 'Updated Task Title',
      }),
      'tasklist-1',
      'task-1'
    );
    expect(mockThread.addLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.removeLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should ignore a minor follow-up on an existing task', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-7',
      getFirstMessageSubject: () => 'Minor Follow-up',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date(Date.now() - 60000) }), // 1 minute ago
        Mocks.getMockMessage({ getDate: () => new Date() }), // now
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    const existingTask = Mocks.createMockTask({
      id: 'task-2',
      title: 'Initial Task',
      notes: 'gmail_thread_id: thread-7',
    });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [existingTask] });
    jest.spyOn(TasksManagerFactory, 'getTasksManager').mockReturnValue({
      findTask: () => existingTask,
      findCheckpoint: () => new Date(Date.now() - 30000).toISOString(),
      upsertTask: jest.fn(),
    });

    const reopenSpy = jest.spyOn(AIAnalyzer, 'shouldReopenTask').mockReturnValue(false);
    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans');

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(reopenSpy).toHaveBeenCalled();
    expect(aiSpy).not.toHaveBeenCalled();
    expect(global.Tasks.Tasks!.update).not.toHaveBeenCalled();
    expect(mockThread.addLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.removeLabel).toHaveBeenCalledWith(mockLabel);
    expect(mockThread.markRead).not.toHaveBeenCalled();
  });
});

describe('Email & Data Edge Cases', () => {
  it('should be idempotent', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-8',
      getFirstMessageSubject: () => 'Idempotency Test',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date() }),
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    const existingTask = Mocks.createMockTask({
      id: 'task-3',
      title: 'Initial Task',
      notes: 'gmail_thread_id: thread-8',
    });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [existingTask] });
    jest.spyOn(TasksManagerFactory, 'getTasksManager').mockReturnValue({
      findTask: () => existingTask,
      findCheckpoint: () => new Date().toISOString(),
      upsertTask: jest.fn(),
    });

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(global.Tasks.Tasks!.insert).not.toHaveBeenCalled();
    expect(global.Tasks.Tasks!.update).not.toHaveBeenCalled();
  });

  it('should handle an email with no body content gracefully', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-9',
      getFirstMessageSubject: () => 'No Body Content',
      getMessages: () => [
        Mocks.getMockMessage({ getPlainBody: () => '' }),
      ],
    });

    const mockLabel = Mocks.getMockLabel({
      getThreads: () => [mockThread],
    });

    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [] });
    jest.spyOn(TasksManagerFactory, 'getTasksManager').mockReturnValue({
      findTask: () => null,
      findCheckpoint: () => new Date(Date.now() - 30000).toISOString(),
      upsertTask: jest.fn(),
    });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        confidence: {
          score: 0,
          reasoning: 'The email has no content.',
          not_higher_reasoning: 'N/A',
          not_lower_reasoning: 'N/A',
        },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.insert).not.toHaveBeenCalled();
  });
});
