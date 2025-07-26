import { Mocks } from "./Mocks";
import { TodoistManager } from "./TodoistManager";
import { Config } from "./Config";

describe("TodoistManager", () => {
  let manager: TodoistManager;
  let mockConfig: Config;

  beforeEach(() => {
    manager = new TodoistManager();
    mockConfig = Mocks.createMockConfig();
    global.UrlFetchApp = Mocks.createMockUrlFetchApp();
  });

  it("should create a new task with a permalink", () => {
    const thread = Mocks.getMockThread({
      getFirstMessageSubject: () => "Test Thread",
    });
    const task = {
      title: "Test Task",
      notes: "Test Notes",
      due_date: "2025-12-31",
      priority: 4,
    };
    global.UrlFetchApp.fetch = jest.fn((url: string, options: any) => ({
      getResponseCode: () => 200,
      getContentText: () => {
        if (url.includes("tasks")) {
          const payload = JSON.parse(options.payload);
          expect(payload.description).toContain("[View in Gmail](https://mail.google.com/mail/u/0/#inbox/thread-id)");
          return JSON.stringify({ id: "12345" });
        }
        return JSON.stringify([]);
      },
    })) as any;
    const result = manager.upsertTask(thread, task, mockConfig, "https://mail.google.com/mail/u/0/#inbox/thread-id");
    expect(result).toBe(true);
  });

  it("should update an existing task with a permalink", () => {
    const thread = Mocks.getMockThread({
      getFirstMessageSubject: () => "Test Thread",
    });
    const task = {
      title: "Test Task",
      notes: "Test Notes",
      due_date: "2025-12-31",
      priority: 4,
    };
    const existingTask = { id: 'task-123', description: 'gmail_thread_id: ' + thread.getId() };
    global.UrlFetchApp.fetch = jest.fn((url: string, options: any) => ({
      getResponseCode: () => 200,
      getContentText: () => {
        if (url.includes("tasks") && options.method === 'post') {
          const payload = JSON.parse(options.payload);
          expect(payload.description).toContain("[View in Gmail](https://mail.google.com/mail/u/0/#inbox/thread-id)");
          return JSON.stringify({ id: "12345" });
        }
        return JSON.stringify([existingTask]);
      },
    })) as any;
    const result = manager.upsertTask(thread, task, mockConfig, "https://mail.google.com/mail/u/0/#inbox/thread-id");
    expect(result).toBe(true);
  });

  it("should return null when no tasks exist", () => {
    global.UrlFetchApp.fetch = jest.fn(() => ({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify([]),
    })) as any;
    const checkpoint = manager.findCheckpoint("thread-123", mockConfig);
    expect(checkpoint).toBeNull();
  });

  it("should find a task by thread id", () => {
    const task1 = { description: "gmail_thread_id: thread-123" };
    const task2 = { description: "gmail_thread_id: thread-456" };
    global.UrlFetchApp.fetch = jest.fn(() => ({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify([task1, task2]),
    })) as any;
    const tasks = manager["findTaskByThreadId"]("thread-123", mockConfig);
    expect(tasks.length).toBe(1);
    expect(tasks[0].description).toBe("gmail_thread_id: thread-123");
  });

  it("should return the updated timestamp of the most recent task", () => {
    const task1 = { updated_at: "2025-07-08T10:00:00Z", description: "gmail_thread_id: thread-123" };
    const task2 = { updated_at: "2025-07-08T11:00:00Z", description: "gmail_thread_id: thread-123" };
    jest.spyOn(manager as any, "findTaskByThreadId").mockReturnValue([task1, task2]);
    const checkpoint = manager.findCheckpoint("thread-123", mockConfig);
    expect(checkpoint).toBe("2025-07-08T11:00:00Z");
  });

  it("should reopen a task", () => {
    global.UrlFetchApp.fetch = jest.fn(() => ({
      getResponseCode: () => 204,
    })) as any;
    jest.spyOn(Config, 'getConfig').mockReturnValue(mockConfig);
    const result = manager.reopenTask("task-123");
    expect(result).toBe(true);
  });
});
