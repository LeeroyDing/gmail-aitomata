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
    const result = manager.upsertTask(thread, task, mockConfig);
    expect(result).toBe(true);
    expect(global.UrlFetchApp.fetch).toHaveBeenCalled();
    expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.todoist.com/api/v1/tasks"),
      expect.objectContaining({
        method: "post",
        headers: {
          Authorization: `Bearer ${mockConfig.todoist_api_key}`,
        },
        contentType: "application/json",
        payload: JSON.stringify({
          content: "Test Task",
          description: "Test Notes\ngmail_thread_id: " + thread.getId(),
          project_id: mockConfig.todoist_project_id,
          due_date: undefined,
          priority: 4,
        }),
        muteHttpExceptions: true,
      })
    );
  });

  it("should find a checkpoint", () => {
    const checkpoint = manager.findCheckpoint("thread-123", mockConfig);
    expect(checkpoint).toBeNull();
  });
});
