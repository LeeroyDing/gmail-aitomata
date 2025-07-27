
import { Mocks } from "./Mocks";
import { TodoistManager } from "./TodoistManager";
import { Config } from "./Config";
import { TodoistApi } from "./TodoistApi";

jest.mock("./TodoistApi");
jest.mock("./Config");

describe("TodoistManager", () => {
  let manager: TodoistManager;
  let mockConfig: Config;
  let mockApi: jest.Mocked<TodoistApi>;

  beforeEach(() => {
    mockConfig = Mocks.createMockConfig();
    mockApi = new TodoistApi() as jest.Mocked<TodoistApi>;
    manager = new TodoistManager(mockApi);
    (Config.getConfig as jest.Mock).mockReturnValue(mockConfig);
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
    mockApi.getTasks.mockReturnValue([]);
    mockApi.createTask.mockReturnValue({ id: "12345", content: "Test Task", description: "", updated_at: "" });
    
    const result = manager.upsertTask(
      thread,
      task,
      mockConfig,
      "https://mail.google.com/mail/u/0/#inbox/thread-id"
    );

    expect(mockApi.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Test Task",
        description: expect.stringContaining("[View in Gmail](https://mail.google.com/mail/u/0/#inbox/thread-id)"),
      }),
      mockConfig
    );
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
    const existingTask = { id: "task-123", description: "gmail_thread_id: " + thread.getId(), content: "old task", updated_at: "" };
    mockApi.getTasks.mockReturnValue([existingTask]);
    mockApi.updateTask.mockReturnValue(undefined);

    const result = manager.upsertTask(
      thread,
      task,
      mockConfig,
      "https://mail.google.com/mail/u/0/#inbox/thread-id"
    );

    expect(mockApi.updateTask).toHaveBeenCalledWith(
      "task-123",
      expect.objectContaining({
        content: "Test Task",
        description: expect.stringContaining("[View in Gmail](https://mail.google.com/mail/u/0/#inbox/thread-id)"),
      }),
      mockConfig
    );
    expect(result).toBe(true);
  });

  it("should return null when no tasks exist", () => {
    mockApi.getTasks.mockReturnValue([]);
    const checkpoint = manager.findCheckpoint("thread-123", mockConfig);
    expect(checkpoint).toBeNull();
  });

  it("should return the updated timestamp of the most recent task", () => {
    const task1 = {
      id: "1",
      content: "task 1",
      updated_at: "2025-07-08T10:00:00Z",
      description: "gmail_thread_id: thread-123",
    };
    const task2 = {
      id: "2",
      content: "task 2",
      updated_at: "2025-07-08T11:00:00Z",
      description: "gmail_thread_id: thread-123",
    };
    mockApi.getTasks.mockReturnValue([task1, task2]);
    const checkpoint = manager.findCheckpoint("thread-123", mockConfig);
    expect(checkpoint).toBe("2025-07-08T11:00:00Z");
  });

  it("should reopen a task", () => {
    mockApi.reopenTask.mockReturnValue(true);
    const result = manager.reopenTask("task-123", mockConfig);
    expect(mockApi.reopenTask).toHaveBeenCalledWith("task-123", mockConfig);
    expect(result).toBe(true);
  });
});
