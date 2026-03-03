export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date: string;
  college_id?: string;
  college_name?: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  due_date: string;
  college_id?: string;
  college_name?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
};

export type UpdateTaskInput = Partial<CreateTaskInput>;
