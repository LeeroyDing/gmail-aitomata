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

describe('Intelligent Follow-up Tests', () => {
  it('should update an existing, incomplete task with new information', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-followup-1',
      getFirstMessageSubject: () => 'Follow-up to Incomplete Task',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date(Date.now() - 60000) }), // 1 minute ago
        Mocks.getMockMessage({ getDate: () => new Date(), getPlainBody: 'Here is some new information.' }), // now
      ],
    });

    const mockLabel = Mocks.getMockLabel({ getThreads: () => [mockThread] });
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);

    const existingTask = Mocks.createMockTask({
      id: 'task-followup-1',
      title: 'Initial Task',
      notes: 'gmail_thread_id: thread-followup-1',
      status: 'needsAction', // Incomplete
    });
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [existingTask] });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        action: 'UPDATE_TASK',
        task: {
          title: 'Updated Task Title',
          notes: 'This task has been updated with new information.',
        },
        confidence: { score: 95, reasoning: 'Substantial new info.', not_higher_reasoning: 'N/A', not_lower_reasoning: 'N/A' },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-followup-1',
        title: 'Updated Task Title',
        notes: expect.stringContaining('new information'),
      }),
      'tasklist-1',
      'task-followup-1'
    );
    expect(global.Tasks.Tasks!.insert).not.toHaveBeenCalled();
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should reopen and update a completed task on substantial follow-up', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-followup-2',
      getFirstMessageSubject: () => 'Follow-up to Completed Task',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date(Date.now() - 60000) }),
        Mocks.getMockMessage({ getDate: () => new Date(), getPlainBody: 'This is a major update, please action this.' }),
      ],
    });

    const mockLabel = Mocks.getMockLabel({ getThreads: () => [mockThread] });
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);

    const existingTask = Mocks.createMockTask({
      id: 'task-followup-2',
      title: 'Completed Task',
      notes: 'gmail_thread_id: thread-followup-2',
      status: 'completed',
    });
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [existingTask] });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        action: 'REOPEN_AND_UPDATE_TASK',
        task: {
          title: 'Reopened and Updated Task',
          notes: 'This task was reopened due to a major update.',
        },
        confidence: { score: 98, reasoning: 'Major update requires reopening.', not_higher_reasoning: 'N/A', not_lower_reasoning: 'N/A' },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    // Check that the task is first reopened (status updated to 'needsAction')
    expect(global.Tasks.Tasks!.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-followup-2', status: 'needsAction' }),
      'tasklist-1',
      'task-followup-2'
    );
    // Check that the task is then updated with the new content
    expect(global.Tasks.Tasks!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-followup-2',
        title: 'Reopened and Updated Task',
      }),
      'tasklist-1',
      'task-followup-2'
    );
    expect(mockThread.markRead).toHaveBeenCalled();
  });

  it('should ignore a minor follow-up to a completed task', () => {
    // Arrange
    const mockThread = Mocks.getMockThread({
      getId: () => 'thread-followup-3',
      getFirstMessageSubject: () => 'Minor Follow-up to Completed Task',
      getMessages: () => [
        Mocks.getMockMessage({ getDate: () => new Date(Date.now() - 60000) }),
        Mocks.getMockMessage({ getDate: () => new Date(), getPlainBody: 'Thanks!' }),
      ],
    });

    const mockLabel = Mocks.getMockLabel({ getThreads: () => [mockThread] });
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);

    const existingTask = Mocks.createMockTask({
      id: 'task-followup-3',
      title: 'Completed Task',
      notes: 'gmail_thread_id: thread-followup-3',
      status: 'completed',
    });
    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    (global.Tasks.Tasks!.list as jest.Mock).mockReturnValue({ items: [existingTask] });

    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      {
        action: 'DO_NOTHING',
        confidence: { score: 5, reasoning: 'Minor follow-up.', not_higher_reasoning: 'N/A', not_lower_reasoning: 'N/A' },
      },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalled();
    expect(global.Tasks.Tasks!.update).not.toHaveBeenCalled();
    expect(global.Tasks.Tasks!.insert).not.toHaveBeenCalled();
    expect(mockThread.markRead).not.toHaveBeenCalled(); // Or should it be marked read? Let's say no for now.
  });

  it('should correctly process a batch of threads with mixed scenarios', () => {
    // Arrange
    const mockThread1 = Mocks.getMockThread({ id: 'batch-1', getFirstMessageSubject: 'New Task' }); // New Task
    const mockThread2 = Mocks.getMockThread({ id: 'batch-2', getFirstMessageSubject: 'Update Task' }); // Update Task
    const mockThread3 = Mocks.getMockThread({ id: 'batch-3', getFirstMessageSubject: 'Reopen Task' }); // Reopen Task
    const mockThread4 = Mocks.getMockThread({ id: 'batch-4', getFirstMessageSubject: 'Ignore' }); // Ignore

    const mockLabel = Mocks.getMockLabel({ getThreads: () => [mockThread1, mockThread2, mockThread3, mockThread4] });
    (global.GmailApp.getUserLabelByName as jest.Mock).mockReturnValue(mockLabel);

    const existingTask2 = Mocks.createMockTask({ id: 'task-batch-2', notes: 'gmail_thread_id: batch-2', status: 'needsAction' });
    const existingTask3 = Mocks.createMockTask({ id: 'task-batch-3', notes: 'gmail_thread_id: batch-3', status: 'completed' });

    (global.Tasks.Tasklists!.list as jest.Mock).mockReturnValue({ items: [{ id: 'tasklist-1', title: 'My Tasks' }] });
    // This mock needs to be more sophisticated to return different tasks for different threads.
    // For simplicity, we'll mock the task manager's findTask method directly.
    const mockTasksManager = {
      findTask: jest.fn((threadId) => {
        if (threadId === 'batch-2') return existingTask2;
        if (threadId === 'batch-3') return existingTask3;
        return null;
      }),
      findCheckpoint: jest.fn().mockReturnValue(null),
      upsertTask: jest.fn().mockReturnValue(true),
      reopenTask: jest.fn().mockReturnValue(true),
    };
    jest.spyOn(TasksManagerFactory, 'getTasksManager').mockReturnValue(mockTasksManager);


    const aiSpy = jest.spyOn(AIAnalyzer, 'generatePlans').mockReturnValue([
      { action: 'CREATE_TASK', task: { title: 'New', notes: '...' }, confidence: { score: 90, reasoning: '...', not_higher_reasoning: '...', not_lower_reasoning: '...' } },
      { action: 'UPDATE_TASK', task: { title: 'Updated', notes: '...' }, confidence: { score: 90, reasoning: '...', not_higher_reasoning: '...', not_lower_reasoning: '...' } },
      { action: 'REOPEN_AND_UPDATE_TASK', task: { title: 'Reopened', notes: '...' }, confidence: { score: 90, reasoning: '...', not_higher_reasoning: '...', not_lower_reasoning: '...' } },
      { action: 'DO_NOTHING', confidence: { score: 10, reasoning: '...', not_higher_reasoning: '...', not_lower_reasoning: '...' } },
    ]);

    // Act
    Processor.processAllUnprocessedThreads();

    // Assert
    expect(aiSpy).toHaveBeenCalledTimes(1);
    expect(mockTasksManager.upsertTask).toHaveBeenCalledWith(mockThread1, expect.objectContaining({ title: 'New' }), expect.any(Object), expect.any(String));
    expect(mockTasksManager.upsertTask).toHaveBeenCalledWith(mockThread2, expect.objectContaining({ title: 'Updated' }), expect.any(Object), expect.any(String));
    expect(mockTasksManager.reopenTask).toHaveBeenCalledWith('task-batch-3');
    expect(mockTasksManager.upsertTask).toHaveBeenCalledWith(mockThread3, expect.objectContaining({ title: 'Reopened' }), expect.any(Object), expect.any(String));
    expect(mockTasksManager.upsertTask).toHaveBeenCalledTimes(3);
  });
});
