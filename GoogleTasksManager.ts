
import { Config } from './Config';
import { Task, TasksManager, TaskDetails } from './TasksManager';

export class GoogleTasksManager implements TasksManager {
  public upsertTask(thread: GoogleAppsScript.Gmail.GmailThread, task: Task, config: Config, permalink: string): string | null {
    const threadId = thread.getId();
    const taskListId = this.getTaskListId(config.default_task_list_name);
    if (!taskListId) {
      return null;
    }

    const existingTask = this.findTaskByThreadId(taskListId, threadId);
    const { priority, ...taskWithoutPriority } = task; // Omit priority

    if (existingTask && existingTask.id) {
      // Update existing task
      const updatedTask = { ...existingTask, ...taskWithoutPriority };
      if (Tasks && Tasks.Tasks) {
        const updated = Tasks.Tasks.update(updatedTask, taskListId, existingTask.id);
        return updated.id ?? null;
      }
    } else {
      // Create new task
      const newTask = {
        ...taskWithoutPriority, notes: `${task.notes}

Link to email: ${permalink}

gmail_thread_id: ${threadId}`
      };
      if (Tasks && Tasks.Tasks) {
        const created = Tasks.Tasks.insert(newTask, taskListId);
        return created.id ?? null;
      }
    }
    return null;
  }

  public findTask(threadId: string, config: Config): TaskDetails | null {
    const taskListId = this.getTaskListId(config.default_task_list_name);
    if (!taskListId) {
      return null;
    }
    const task = this.findTaskByThreadId(taskListId, threadId);
    return task ? this.normalizeTask(task) : null;
  }

  public findCompletedTask(threadId: string, config: Config): TaskDetails | null {
    const taskListId = this.getTaskListId(config.default_task_list_name);
    if (!taskListId) {
      return null;
    }
    const task = this.findTaskByThreadId(taskListId, threadId, true);
    return task ? this.normalizeTask(task) : null;
  }

  private normalizeTask(task: GoogleAppsScript.Tasks.Schema.Task): TaskDetails {
    return {
      id: task.id || '',
      title: task.title || '',
      notes: task.notes || '',
      due_date: task.due ? task.due.substring(0, 10) : undefined,
      status: task.status === 'completed' ? 'completed' : 'needsAction'
    };
  }

  private findTaskByThreadId(taskListId: string, threadId: string, completedOnly: boolean = false): GoogleAppsScript.Tasks.Schema.Task | null {
    if (Tasks && Tasks.Tasks) {
      const tasks = Tasks.Tasks.list(taskListId, { showCompleted: true, showHidden: true });
      if (tasks.items) {
        for (const task of tasks.items) {
          if (task.notes && task.notes.includes(`gmail_thread_id: ${threadId}`)) {
            if (completedOnly) {
              if (task.status === 'completed') return task;
            } else {
              if (task.status !== 'completed') return task;
            }
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

  public reopenTask(taskId: string, config: Config): boolean {
    const taskListId = this.getTaskListId(config.default_task_list_name);
    if (!taskListId) {
      return false;
    }
    if (Tasks && Tasks.Tasks) {
      const task = Tasks.Tasks.get(taskListId, taskId);
      task.status = 'needsAction';
      Tasks.Tasks.update(task, taskListId, taskId);
      return true;
    }
    return false;
  }

  /**
   * Finds the latest task activity timestamp for a given thread.
   *
   * This method queries both active and completed tasks associated with the
   * provided thread ID. It then identifies the task with the most recent
   * 'updated' timestamp, which serves as a checkpoint for processing new
   * messages in the thread.
   *
   * @param threadId The ID of the Gmail thread to check.
   * @param config The configuration object.
   * @returns The 'updated' timestamp of the latest task as an ISO 8601 string, or null if no tasks are found.
   */
  public findCheckpoint(threadId: string, config: Config): string | null {
    const taskListId = this.getTaskListId(config.default_task_list_name);
    if (!taskListId) {
      return null;
    }

    const allTasks: GoogleAppsScript.Tasks.Schema.Task[] = [];

    // Fetch active tasks
    let activeTasks = Tasks?.Tasks?.list(taskListId, { showCompleted: false });
    if (activeTasks && activeTasks.items) {
      allTasks.push(...activeTasks.items.filter((task) => task.notes?.includes(`gmail_thread_id: ${threadId}`)));
    }

    // Fetch completed tasks
    let completedTasks = Tasks?.Tasks?.list(taskListId, { showCompleted: true, showHidden: true });
    if (completedTasks && completedTasks.items) {
      allTasks.push(...completedTasks.items.filter((task) => task.notes?.includes(`gmail_thread_id: ${threadId}`)));
    }

    if (allTasks.length === 0) {
      return null;
    }

    // Find the task with the most recent 'updated' timestamp
    const latestTask = allTasks.reduce((latest, current) => {
      if (!latest.updated || !current.updated) return latest;
      return new Date(latest.updated) > new Date(current.updated) ? latest : current;
    });

    return latestTask.updated ?? null;
  }
}
