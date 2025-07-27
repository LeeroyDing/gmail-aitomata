
import { Config } from './Config';
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';
import { TasksManager } from './TasksManager';
import { TodoistApi } from './TodoistApi';

export class TasksManagerFactory {
  constructor() {}

  public getTasksManager(config: Config): TasksManager {
    if (config.task_service === 'Google Tasks') {
      return new GoogleTasksManager();
    } else if (config.task_service === 'Todoist') {
      return new TodoistManager(new TodoistApi());
    } else {
      throw new Error(`Unknown task service: ${config.task_service}`);
    }
  }
}
