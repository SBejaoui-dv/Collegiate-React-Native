import { getAccessToken } from '@/app/features/auth/services/auth.service';
import { CreateTaskInput, Task, UpdateTaskInput } from '@/app/features/tasks/types/task.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

async function withAuthHeaders() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be logged in to access tasks.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function listTasks(filters?: {
  status?: string;
  college_id?: string;
}): Promise<Task[]> {
  const headers = await withAuthHeaders();
  const query = new URLSearchParams();
  if (filters?.status) {
    query.append('status', filters.status);
  }
  if (filters?.college_id) {
    query.append('college_id', filters.college_id);
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${API_URL}/api/tasks${suffix}`, { headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to fetch tasks.');
  }
  return (payload?.tasks || []) as Task[];
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to create task.');
  }
  return payload.task as Task;
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to update task.');
  }
  return payload.task as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
    method: 'DELETE',
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to delete task.');
  }
}

export async function getPendingTasksCount(): Promise<number> {
  const tasks = await listTasks();
  return tasks.filter((task) => task.status !== 'completed').length;
}
