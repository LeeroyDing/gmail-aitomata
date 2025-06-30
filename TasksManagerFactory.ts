import { Config } from './Config';
import { TasksManager } from './TasksManager';
import { GoogleTasksManager } from './GoogleTasksManager';
import { TodoistManager } from './TodoistManager';

export class TasksManagerFactory {
  public static getTasksManager(config: Config): TasksManager {
    switch (config.task_service) {
      case 'Todoist':
        return new TodoistManager();
      case 'Google Tasks':
      default:
        return new GoogleTasksManager();
    }
  }
}
