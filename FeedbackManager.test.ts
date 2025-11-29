
import { FeedbackManager } from './FeedbackManager';
import { Config } from './Config';
import { TasksManager } from './TasksManager';
import { AIAnalyzer } from './AIAnalyzer';

// Mock SpreadsheetApp and related classes
const mockSheet = {
    appendRow: jest.fn(),
    getDataRange: jest.fn(),
    getRange: jest.fn(),
    deleteRow: jest.fn(),
    insertSheet: jest.fn(),
    getName: jest.fn(),
};

const mockSpreadsheet = {
    getSheetByName: jest.fn(),
    insertSheet: jest.fn(),
};

const mockRange = {
    getDisplayValues: jest.fn(),
    setValue: jest.fn(),
};

(global as any).SpreadsheetApp = {
    getActiveSpreadsheet: jest.fn(() => mockSpreadsheet),
};

// Mock TasksManager
const mockTasksManager: TasksManager = {
    upsertTask: jest.fn(),
    findCheckpoint: jest.fn(),
    findTask: jest.fn(),
    findCompletedTask: jest.fn(),
    reopenTask: jest.fn(),
};

// Mock AIAnalyzer
jest.mock('./AIAnalyzer');

describe('FeedbackManager', () => {
    let config: Config;

    beforeEach(() => {
        jest.clearAllMocks();
        config = {
            unprocessed_label: 'unprocessed',
            processed_label: 'processed',
            processing_failed_label: 'error',
            force_task_label: 'aitomata/force',
            processing_frequency_in_minutes: 5,
            hour_of_day_to_run_sanity_checking: 0,
            go_link: '',
            max_threads: 50,
            default_task_list_name: 'My Tasks',
            GEMINI_API_KEY: 'test-key',
            task_service: 'Todoist',
            todoist_api_key: 'test-token',
            todoist_project_id: 'test-project',
            gemini_model: 'gemini-2.5-flash',
        };

        mockSpreadsheet.getSheetByName.mockReturnValue(mockSheet);
        mockSheet.getDataRange.mockReturnValue(mockRange);
        mockSheet.getRange.mockReturnValue(mockRange);
        mockSpreadsheet.insertSheet.mockReturnValue(mockSheet);
    });

    describe('recordTaskCreation', () => {
        it('should append a row to the tracker sheet', () => {
            const threadId = 'thread-123';
            const taskId = 'task-456';
            const task = {
                title: 'Test Task',
                notes: 'Notes',
                due_date: '2023-01-01',
                priority: 1,
            };

            FeedbackManager.recordTaskCreation(threadId, taskId, task);

            expect(mockSpreadsheet.getSheetByName).toHaveBeenCalledWith('Task_Tracker');
            expect(mockSheet.appendRow).toHaveBeenCalledWith([
                threadId,
                taskId,
                task.title,
                task.due_date,
                task.priority,
                expect.any(String), // Timestamp
            ]);
        });

        it('should create the sheet if it does not exist', () => {
            mockSpreadsheet.getSheetByName.mockReturnValue(null);

            const threadId = 'thread-123';
            const taskId = 'task-456';
            const task = { title: 'Test', notes: 'Notes' };

            FeedbackManager.recordTaskCreation(threadId, taskId, task);

            expect(mockSpreadsheet.insertSheet).toHaveBeenCalledWith('Task_Tracker');
            expect(mockSheet.appendRow).toHaveBeenCalledTimes(2); // Header + Data
        });
    });

    describe('analyzeFeedback', () => {
        it('should do nothing if tracker sheet is empty', () => {
            mockRange.getDisplayValues.mockReturnValue([]);
            FeedbackManager.analyzeFeedback(mockTasksManager, config);
            expect(mockTasksManager.findTask).not.toHaveBeenCalled();
        });

        it('should detect changes and generate learning', () => {
            // Mock tracker data: Header + 1 Row
            mockRange.getDisplayValues.mockReturnValue([
                ['ThreadID', 'TaskID', 'OriginalTitle', 'OriginalDueDate', 'OriginalPriority', 'CreatedAt'],
                ['thread-1', 'task-1', 'Original Title', '2023-01-01', '1', '2023-01-01T00:00:00Z'],
            ]);

            // Mock current task state (Changed Title)
            (mockTasksManager.findTask as jest.Mock).mockReturnValue({
                id: 'task-1',
                title: 'New Title',
                notes: 'Notes',
                due_date: '2023-01-01',
                priority: '1',
                status: 'needsAction'
            });

            // Mock AI generation
            (AIAnalyzer.generateLearning as jest.Mock).mockReturnValue('Always use short titles');

            FeedbackManager.analyzeFeedback(mockTasksManager, config);

            // Verify AI called
            expect(AIAnalyzer.generateLearning).toHaveBeenCalledWith(
                expect.objectContaining({
                    original: { title: 'Original Title', due_date: '2023-01-01', priority: '1' },
                    current: { title: 'New Title', due_date: '2023-01-01', priority: '1' },
                }),
                config
            );

            // Verify learning recorded
            expect(mockSpreadsheet.getSheetByName).toHaveBeenCalledWith('AI_Learnings');
            expect(mockSheet.appendRow).toHaveBeenCalledWith(['Always use short titles', '100', 'task-1', '0']);

            // Verify tracker updated
            expect(mockSheet.getRange).toHaveBeenCalled();
            expect(mockRange.setValue).toHaveBeenCalledWith('New Title');
        });

        it('should handle deleted tasks (generate learning and stop tracking)', () => {
            mockRange.getDisplayValues.mockReturnValue([
                ['ThreadID', 'TaskID', 'OriginalTitle', 'OriginalDueDate', 'OriginalPriority', 'CreatedAt'],
                ['thread-1', 'task-1', 'Original Title', '2023-01-01', '1', '2023-01-01T00:00:00Z'],
            ]);

            // Task not found
            (mockTasksManager.findTask as jest.Mock).mockReturnValue(null);

            // Mock AI generation
            (AIAnalyzer.generateLearning as jest.Mock).mockReturnValue('Do not create tasks for this type of email');

            FeedbackManager.analyzeFeedback(mockTasksManager, config);

            // Verify AI called with DELETED
            expect(AIAnalyzer.generateLearning).toHaveBeenCalledWith(
                expect.objectContaining({
                    original: { title: 'Original Title', due_date: '2023-01-01', priority: '1' },
                    current: 'DELETED',
                }),
                config
            );

            // Verify learning recorded
            expect(mockSheet.appendRow).toHaveBeenCalledWith(['Do not create tasks for this type of email', '100', 'task-1', '0']);

            // Verify row deleted
            expect(mockSheet.deleteRow).toHaveBeenCalledWith(2); // Row 2 (1-based)
        });

        it('should handle completed tasks (stop tracking, no learning)', () => {
            mockRange.getDisplayValues.mockReturnValue([
                ['ThreadID', 'TaskID', 'OriginalTitle', 'OriginalDueDate', 'OriginalPriority', 'CreatedAt'],
                ['thread-1', 'task-1', 'Original Title', '2023-01-01', '1', '2023-01-01T00:00:00Z'],
            ]);

            // Task not found in active
            (mockTasksManager.findTask as jest.Mock).mockReturnValue(null);
            // Task found in completed
            (mockTasksManager.findCompletedTask as jest.Mock).mockReturnValue({
                id: 'task-1',
                title: 'Original Title',
                notes: 'Notes',
                due_date: '2023-01-01',
                priority: '1',
                status: 'completed'
            });

            FeedbackManager.analyzeFeedback(mockTasksManager, config);

            // Verify AI NOT called
            expect(AIAnalyzer.generateLearning).not.toHaveBeenCalled();

            // Verify row deleted (stop tracking)
            expect(mockSheet.deleteRow).toHaveBeenCalledWith(2);
        });

        it('should handle null learning from AI (stop tracking, no recording)', () => {
            mockRange.getDisplayValues.mockReturnValue([
                ['ThreadID', 'TaskID', 'OriginalTitle', 'OriginalDueDate', 'OriginalPriority', 'CreatedAt'],
                ['thread-1', 'task-1', 'Original Title', '2023-01-01', '1', '2023-01-01T00:00:00Z'],
            ]);

            // Task not found (deleted)
            (mockTasksManager.findTask as jest.Mock).mockReturnValue(null);
            (mockTasksManager.findCompletedTask as jest.Mock).mockReturnValue(null);

            // Mock AI returning null
            (AIAnalyzer.generateLearning as jest.Mock).mockReturnValue(null);

            FeedbackManager.analyzeFeedback(mockTasksManager, config);

            // Verify AI called
            expect(AIAnalyzer.generateLearning).toHaveBeenCalled();

            // Verify learning NOT recorded
            expect(mockSheet.appendRow).not.toHaveBeenCalled();

            // Verify row deleted
            expect(mockSheet.deleteRow).toHaveBeenCalledWith(2);
        });

        it('should ignore tasks with no changes', () => {
            mockRange.getDisplayValues.mockReturnValue([
                ['ThreadID', 'TaskID', 'OriginalTitle', 'OriginalDueDate', 'OriginalPriority', 'CreatedAt'],
                ['thread-1', 'task-1', 'Same Title', '2023-01-01', '1', '2023-01-01T00:00:00Z'],
            ]);

            (mockTasksManager.findTask as jest.Mock).mockReturnValue({
                id: 'task-1',
                title: 'Same Title',
                notes: 'Notes',
                due_date: '2023-01-01',
                priority: '1',
                status: 'needsAction'
            });

            FeedbackManager.analyzeFeedback(mockTasksManager, config);

            expect(AIAnalyzer.generateLearning).not.toHaveBeenCalled();
            expect(mockSheet.getRange).not.toHaveBeenCalled();
        });
    });
});
