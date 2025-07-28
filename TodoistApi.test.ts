import { Mocks } from "./Mocks";
import { TodoistApi } from "./TodoistApi";
import { Config } from "./Config";

describe("TodoistApi", () => {
  let api: TodoistApi;
  let mockConfig: Config;

  beforeEach(() => {
    api = new TodoistApi();
    mockConfig = Mocks.createMockConfig();
    global.UrlFetchApp = Mocks.createMockUrlFetchApp();
  });

  it("should create a new task", () => {
    const task = {
      content: "Test Task",
      due_string: "tomorrow",
      priority: 4,
    };
    global.UrlFetchApp.fetch = jest.fn((url: string, options: any) => {
      expect(url).toBe("https://api.todoist.com/api/v1/tasks");
      const payload = JSON.parse(options.payload);
      expect(payload.content).toBe("Test Task");
      return Mocks.getMockUrlFetchResponse(200, JSON.stringify({ id: "12345" }));
    }) as any;
    const result = api.createTask(task, mockConfig);
    expect(result).toEqual({ id: "12345" });
  });

  it("should get all tasks", () => {
    const tasks = [{ id: "1" }, { id: "2" }];
    global.UrlFetchApp.fetch = jest.fn((url: string, options: any) => {
      expect(url).toBe("https://api.todoist.com/api/v1/tasks");
      return Mocks.getMockUrlFetchResponse(200, JSON.stringify(tasks));
    }) as any;
    const result = api.getTasks(mockConfig);
    expect(result).toEqual(tasks);
  });

  it("should get completed tasks", () => {
    const completedTasks = { items: [{ id: "1" }, { id: "2" }] };
    global.UrlFetchApp.fetch = jest.fn((url: string, options: any) => {
      expect(url).toContain("https://api.todoist.com/api/v1/tasks/completed/by_completion_date");
      return Mocks.getMockUrlFetchResponse(200, JSON.stringify(completedTasks));
    }) as any;
    const result = api.getCompletedTasks(mockConfig);
    expect(result).toEqual(completedTasks.items);
  });

  it("should update a task", () => {
    const task = {
      content: "Updated Task",
    };
    global.UrlFetchApp.fetch = jest.fn((url: string, options: any) => {
      expect(url).toBe("https://api.todoist.com/api/v1/tasks/task-123");
      expect(options.method).toBe("post");
      return Mocks.getMockUrlFetchResponse(204, "");
    }) as any;
    expect(() => api.updateTask("task-123", task, mockConfig)).not.toThrow();
  });

  it("should reopen a task", () => {
    global.UrlFetchApp.fetch = jest.fn((url: string, options: any) => {
      expect(url).toBe("https://api.todoist.com/api/v1/tasks/task-123/reopen");
      expect(options.method).toBe("post");
      return Mocks.getMockUrlFetchResponse(204, "");
    }) as any;
    const result = api.reopenTask("task-123", mockConfig);
    expect(result).toBe(true);
  });
});