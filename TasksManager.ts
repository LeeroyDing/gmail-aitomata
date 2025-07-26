
import { Config } from './Config';

export interface Task {
  title: string;
  notes: string;
  due_date: string;
  priority: number;
  status?: 'needsAction' | 'completed';
}

export interface TasksManager {
  upsertTask(thread: GoogleAppsScript.Gmail.GmailThread, task: Task, config: Config, permalink: string): boolean;
  findCheckpoint(threadId: string, config: Config): string | null;
  findTask(threadId: string, config: Config): any | null;
  reopenTask(taskId: string): boolean;
}
