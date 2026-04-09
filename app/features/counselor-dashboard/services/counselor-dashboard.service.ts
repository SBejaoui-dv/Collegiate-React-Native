import { getAccessToken } from '@/app/features/auth/services/auth.service';
import {
  Checklist,
  DashboardStats,
  Document,
  Student,
  StudentTask,
} from '@/app/features/counselor-dashboard/types/counselor-dashboard.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

async function withAuthHeaders() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be logged in to access counselor data.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function getJson<T>(path: string, fallbackError: string): Promise<T> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, { method: 'GET', headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || fallbackError);
  }

  return payload as T;
}

export async function fetchCounselorStudents(): Promise<Student[]> {
  const payload = await getJson<{ students?: Record<string, unknown>[] }>(
    '/api/counselor/students',
    'Failed to fetch counselor students.',
  );
  return (payload.students || []).map(mapApiStudent);
}

export async function fetchCounselorTasks(): Promise<StudentTask[]> {
  const payload = await getJson<{ tasks?: Record<string, unknown>[] }>(
    '/api/counselor/tasks',
    'Failed to fetch counselor tasks.',
  );
  return (payload.tasks || []).map(mapApiTask);
}

export async function fetchCounselorChecklists(): Promise<Checklist[]> {
  const payload = await getJson<{ checklists?: Record<string, unknown>[] }>(
    '/api/counselor/checklists',
    'Failed to fetch counselor checklists.',
  );
  return (payload.checklists || []).map(mapApiChecklist);
}

export async function fetchCounselorDocuments(): Promise<Document[]> {
  const payload = await getJson<{ documents?: Record<string, unknown>[] }>(
    '/api/counselor/documents',
    'Failed to fetch counselor documents.',
  );
  return (payload.documents || []).map(mapApiDocument);
}

export function buildDashboardStats(students: Student[], tasks: StudentTask[]): DashboardStats {
  const notStarted = students.filter((student) => student.applicationStatus === 'Not Started').length;
  const inProgress = students.filter((student) => student.applicationStatus === 'In Progress').length;
  const submitted = students.filter((student) => student.applicationStatus === 'Submitted').length;

  const overdueCount = tasks.filter((task) => !task.completed && isOverdue(task.deadline)).length;
  const highRiskCount = students.filter((student) => {
    const studentTasks = tasks.filter((task) => task.studentId === student.id);
    const overdueForStudent = studentTasks.filter((task) => !task.completed && isOverdue(task.deadline)).length;
    return overdueForStudent >= 2 || (student.grade === 'Senior' && student.applicationStatus === 'Not Started');
  }).length;

  return {
    totalStudents: students.length,
    notStarted,
    inProgress,
    submitted,
    overdueCount,
    highRiskCount,
  };
}

function isOverdue(dateText: string): boolean {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function mapApiStudent(source: Record<string, unknown>): Student {
  return {
    id: String(source.student_id || source.id || ''),
    name: String(source.full_name || source.name || 'Unknown Student'),
    email: String(source.email || ''),
    grade: source.grade === 'Senior' ? 'Senior' : 'Junior',
    collegesSaved: Number(source.colleges_saved || 0),
    essaysCompleted: Number(source.essays_completed || 0),
    totalEssays: Number(source.total_essays || 0),
    applicationStatus: normalizeApplicationStatus(source.application_status),
    lastActive: String(source.last_active || 'Unknown'),
  };
}

function mapApiTask(source: Record<string, unknown>): StudentTask {
  return {
    id: String(source.id || ''),
    studentId: String(source.student_id || source.user_id || ''),
    title: String(source.title || ''),
    deadline: String(source.deadline || source.due_date || ''),
    completed: Boolean(source.completed || source.status === 'completed'),
    category: normalizeTaskCategory(source.category),
  };
}

function mapApiChecklist(source: Record<string, unknown>): Checklist {
  return {
    id: String(source.id || ''),
    title: String(source.title || 'Untitled Checklist'),
    description: String(source.description || ''),
    assignedStudents: Number(source.assigned_students || source.assignedStudents || 0),
  };
}

function mapApiDocument(source: Record<string, unknown>): Document {
  return {
    id: String(source.id || ''),
    title: String(source.title || 'Untitled Document'),
    category: normalizeDocumentCategory(source.category),
    fileType: normalizeFileType(source.fileType || source.file_type),
    uploadedAt: String(source.uploaded_at || source.uploadedAt || ''),
  };
}

function normalizeApplicationStatus(value: unknown): Student['applicationStatus'] {
  if (value === 'In Progress') return 'In Progress';
  if (value === 'Submitted') return 'Submitted';
  return 'Not Started';
}

function normalizeTaskCategory(value: unknown): StudentTask['category'] {
  if (value === 'Application') return 'Application';
  if (value === 'Essay') return 'Essay';
  if (value === 'Testing') return 'Testing';
  if (value === 'Financial Aid') return 'Financial Aid';
  return 'General';
}

function normalizeDocumentCategory(value: unknown): Document['category'] {
  if (value === 'Essays') return 'Essays';
  if (value === 'Testing') return 'Testing';
  if (value === 'Financial Aid') return 'Financial Aid';
  return 'General';
}

function normalizeFileType(value: unknown): Document['fileType'] {
  if (value === 'PDF') return 'PDF';
  if (value === 'DOC') return 'DOC';
  if (value === 'XLSX') return 'XLSX';
  return 'Link';
}
