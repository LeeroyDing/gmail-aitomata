
import { Config } from "./Config";
import { TasksManager } from "./TasksManager";
import { AIAnalyzer } from "./AIAnalyzer";
import { Task } from "./TasksManager";

export class FeedbackManager {
    private static readonly TRACKER_SHEET_NAME = "Task_Tracker";
    private static readonly LEARNINGS_SHEET_NAME = "AI_Learnings";

    /**
     * Records the initial state of a task created by the AI.
     */
    public static recordTaskCreation(
        threadId: string,
        taskId: string,
        task: Task
    ) {
        const sheet = this.getOrCreateSheet(this.TRACKER_SHEET_NAME);
        const timestamp = new Date().toISOString();
        // Columns: ThreadID, TaskID, OriginalTitle, OriginalDueDate, OriginalPriority, CreatedAt
        sheet.appendRow([
            threadId,
            taskId,
            task.title,
            task.due_date || "",
            task.priority || "",
            timestamp,
        ]);
    }

    /**
     * Analyzes active tasks for user modifications and generates learnings.
     */
    public static analyzeFeedback(
        tasksManager: TasksManager,
        config: Config
    ) {
        const sheet = this.getOrCreateSheet(this.TRACKER_SHEET_NAME);
        const data = sheet.getDataRange().getDisplayValues();
        // Skip header
        if (data.length <= 1) return;

        const rows = data.slice(1);
        const rowsToDelete: number[] = [];

        // Map headers to indices
        const idx = {
            threadId: 0,
            taskId: 1,
            title: 2,
            dueDate: 3,
            priority: 4,
            createdAt: 5,
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const threadId = row[idx.threadId];
            const taskId = row[idx.taskId];
            const originalTitle = row[idx.title];
            const originalDueDate = row[idx.dueDate];
            const originalPriority = row[idx.priority];

            try {
                // We use findTask which usually takes threadId. 
                // Some implementations might support finding by TaskId directly, but the interface uses threadId.
                // However, findTask returns the *current* state.
                const currentTask = tasksManager.findTask(threadId, config);

                if (!currentTask) {
                    // Task might be deleted or completed and archived.
                    // For now, if we can't find it, we assume it's done/gone and stop tracking it to keep sheet small.
                    // Or we could check completed tasks if supported.
                    // Let's assume if not found, we stop tracking.
                    rowsToDelete.push(i + 2); // +2 because 1-based and header
                    continue;
                }

                // Normalize current task data
                // Google Tasks and Todoist have different structures, but we expect them to roughly match our Task interface
                // or we need to adapt.
                // Since tasksManager.findTask returns 'any', we need to be careful.

                let currentTitle = "";
                let currentDueDate = "";
                let currentPriority = "";

                if (config.task_service === 'Todoist') {
                    // TodoistTask
                    currentTitle = currentTask.content;
                    currentDueDate = currentTask.due ? currentTask.due.date : "";
                    currentPriority = currentTask.priority ? String(currentTask.priority) : "";
                } else {
                    // Google Task
                    currentTitle = currentTask.title;
                    currentDueDate = currentTask.due ? currentTask.due.substring(0, 10) : ""; // YYYY-MM-DD
                    // Google Tasks API doesn't strictly have priority in the same way, usually position.
                    // But our Task interface has it. If GoogleTasksManager doesn't support it, it might be undefined.
                    currentPriority = ""; // Google Tasks doesn't really have priority field exposed easily in standard API same as Todoist
                }

                const hasTitleChanged = currentTitle !== originalTitle;
                const hasDateChanged = currentDueDate !== originalDueDate;
                // Only check priority for Todoist for now as Google Tasks priority is complex
                const hasPriorityChanged = config.task_service === 'Todoist' && currentPriority !== originalPriority;

                if (hasTitleChanged || hasDateChanged || hasPriorityChanged) {
                    console.log(`Detected change for task ${taskId}`);

                    const diff = {
                        original: { title: originalTitle, due_date: originalDueDate, priority: originalPriority },
                        current: { title: currentTitle, due_date: currentDueDate, priority: currentPriority }
                    };

                    // Generate Learning
                    const learning = AIAnalyzer.generateLearning(diff, config);
                    if (learning) {
                        this.recordLearning(learning, taskId);
                    }

                    // Update the tracker with new values so we don't learn the same thing again
                    // We need to update the specific cells.
                    // Since we are iterating, we can't easily batch update random rows without re-reading.
                    // But we can use sheet.getRange(row, col).setValue().
                    // It's slow but fine for small volume.
                    const rowNum = i + 2;
                    sheet.getRange(rowNum, idx.title + 1).setValue(currentTitle);
                    sheet.getRange(rowNum, idx.dueDate + 1).setValue(currentDueDate);
                    sheet.getRange(rowNum, idx.priority + 1).setValue(currentPriority);
                }

            } catch (e) {
                console.error(`Error analyzing feedback for task ${taskId}: ${e}`);
            }
        }

        // Delete rows in reverse order
        for (let i = rowsToDelete.length - 1; i >= 0; i--) {
            sheet.deleteRow(rowsToDelete[i]);
        }
    }

    private static recordLearning(learning: string, sourceTaskId: string) {
        const sheet = this.getOrCreateSheet(this.LEARNINGS_SHEET_NAME);
        sheet.appendRow([learning, "100", sourceTaskId, "0"]);
    }

    public static getLearnings(): string[] {
        const sheet = this.getOrCreateSheet(this.LEARNINGS_SHEET_NAME);
        const data = sheet.getDataRange().getDisplayValues();
        if (data.length <= 1) return [];
        return data.slice(1).map(row => row[0]);
    }

    private static getOrCreateSheet(sheetName: string): GoogleAppsScript.Spreadsheet.Sheet {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            if (sheetName === this.TRACKER_SHEET_NAME) {
                sheet.appendRow(["ThreadID", "TaskID", "OriginalTitle", "OriginalDueDate", "OriginalPriority", "CreatedAt"]);
            } else if (sheetName === this.LEARNINGS_SHEET_NAME) {
                sheet.appendRow(["Rule", "Confidence", "SourceTaskID", "AppliedCount"]);
            }
        }
        return sheet;
    }
}
