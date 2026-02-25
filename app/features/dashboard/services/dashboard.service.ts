import { getAccessToken } from '@/app/features/auth/services/auth.service';
import { College } from '@/app/features/search/types/search.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

type SavedCollege = {
  id: string;
  college_name: string;
  city?: string;
  state?: string;
};

async function withAuthHeaders() {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('You must be logged in to modify dashboard colleges.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function listDashboardColleges(): Promise<SavedCollege[]> {
  const headers = await withAuthHeaders();

  const response = await fetch(`${API_URL}/api/database/list`, {
    method: 'GET',
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load dashboard colleges.');
  }

  return (payload?.colleges || []) as SavedCollege[];
}

export async function addCollegeToDashboard(college: College): Promise<void> {
  const headers = await withAuthHeaders();

  const response = await fetch(`${API_URL}/api/database/insert`, {
    method: 'POST',
    headers,
    body: JSON.stringify(college),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to add college.');
  }
}

export async function removeCollegeFromDashboard(collegeId: string): Promise<void> {
  const headers = await withAuthHeaders();

  const response = await fetch(`${API_URL}/api/database/delete/${collegeId}`, {
    method: 'DELETE',
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to remove college.');
  }
}
