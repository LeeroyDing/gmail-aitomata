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

  it("should create a new task", () => {
    const thread = Mocks.getMockThread({
      getFirstMessageSubject: () => "Test Thread",
    });
    const task = {
      title: "Test Task",
      notes: "Test Notes",
      due_date: undefined,
      priority: 4,
    };
    global.UrlFetchApp.fetch = jest.fn((url: string) => ({
      getResponseCode: () => 200,
      getContentText: () => {
        if (url.includes("sync")) {
          return JSON.stringify({
            items: [],
          });
        } else {
          return JSON.stringify({ id: "12345" });
        }
      },
    })) as any;
    const result = manager.upsertTask(thread, task, mockConfig);
    expect(result).toBe(true);
    expect(global.UrlFetchApp.fetch).toHaveBeenCalled();
  });

  it("should return null when no tasks exist", () => {
    global.UrlFetchApp.fetch = jest.fn(() => ({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ items: [] }),
    })) as any;
    const checkpoint = manager.findCheckpoint("thread-123", mockConfig);
    expect(checkpoint).toBeNull();
  });

  it("should return the updated timestamp of the most recent task", () => {
    const task1 = { updated_at: "2025-07-08T10:00:00Z", description: "gmail_thread_id: thread-123" };
    const task2 = { updated_at: "2025-07-08T11:00:00Z", description: "gmail_thread_id: thread-123" };
    global.UrlFetchApp.fetch = jest.fn(() => ({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ items: [task1, task2] }),
    })) as any;
    const checkpoint = manager.findCheckpoint("thread-123", mockConfig);
    expect(checkpoint).toBe("2025-07-08T11:00:00Z");
  });
});
