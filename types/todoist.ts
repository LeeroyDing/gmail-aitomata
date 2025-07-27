
export interface NewTaskPayload {
  content: string;
  description?: string;
  due_date?: string;
  priority?: number;
  project_id?: string;
}

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  updated_at: string;
}
