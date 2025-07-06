
import { Config } from './Config';
import { Task, TasksManager } from './TasksManager';

export class GoogleTasksManager implements TasksManager {
  public upsertTask(thread: GoogleAppsScript.Gmail.GmailThread, task: Task, config: Config): boolean {
    const threadId = thread.getId();
    const taskListId = this.getTaskListId(config.default_task_list_name);
    if (!taskListId) {
      return false;
    }

    const existingTask = this.findTaskByThreadId(taskListId, threadId);
    if (existingTask && existingTask.id) {
      // Update existing task
      const updatedTask = { ...existingTask, ...task };
      if (Tasks && Tasks.Tasks) {
        Tasks.Tasks.update(updatedTask, taskListId, existingTask.id);
      }
    } else {
      // Create new task
      const newTask = { ...task, notes: `${task.notes}\n\ngmail_thread_id: ${threadId}` };
      if (Tasks && Tasks.Tasks) {
        Tasks.Tasks.insert(newTask, taskListId);
      }
    }
    return true;
  }

  private findTaskByThreadId(taskListId: string, threadId: string): GoogleAppsScript.Tasks.Schema.Task | null {
    if (Tasks && Tasks.Tasks) {
      const tasks = Tasks.Tasks.list(taskListId);
      if (tasks.items) {
        for (const task of tasks.items) {
          if (task.notes && task.notes.includes(`gmail_thread_id: ${threadId}`)) {
            return task;
          }
        }
      }
    }
    return null;
  }

  private getTaskListId(taskListName: string): string | null {
    if (Tasks && Tasks.Tasklists) {
      const taskLists = Tasks.Tasklists.list();
      if (taskLists.items) {
        for (const taskList of taskLists.items) {
          if (taskList.title === taskListName) {
            return taskList.id ?? null;
          }
        }
      }
    }
    return null;
  }

  public findCheckpoint(threadId: string, config: Config): string | null {
    // Implementation for Google Tasks
    return null;
  }
}
