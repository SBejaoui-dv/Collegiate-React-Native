import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { SavedScholarship, ScholarshipOpportunity } from '@/app/features/search/types/scholarship.types';

export const SAVED_SCHOLARSHIPS_STORAGE_KEY = 'saved_scholarships_v1';

const SCHOLARSHIPS_FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}${SAVED_SCHOLARSHIPS_STORAGE_KEY}.json`
  : null;

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function scholarshipDedupKey(item: {
  name: string;
  provider: string;
  apply_url: string;
  collegeName: string;
}): string {
  const normalizedCollege = normalizeText(item.collegeName);
  const normalizedUrl = normalizeText(item.apply_url);

  if (normalizedUrl) {
    return `${normalizedCollege}::url::${normalizedUrl}`;
  }

  return `${normalizedCollege}::name::${normalizeText(item.name)}::provider::${normalizeText(item.provider)}`;
}

function dedupeScholarships(items: SavedScholarship[]): SavedScholarship[] {
  const map = new Map<string, SavedScholarship>();

  for (const item of items) {
    const key = scholarshipDedupKey(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    const existingTime = new Date(existing.savedAt).getTime() || 0;
    const incomingTime = new Date(item.savedAt).getTime() || 0;

    if (incomingTime > existingTime) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.savedAt).getTime() || 0;
    const bTime = new Date(b.savedAt).getTime() || 0;
    return bTime - aTime;
  });
}

async function writeScholarships(items: SavedScholarship[]): Promise<void> {
  const deduped = dedupeScholarships(items);
  const serialized = JSON.stringify(deduped);

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_SCHOLARSHIPS_STORAGE_KEY, serialized);
    }
    return;
  }

  if (!SCHOLARSHIPS_FILE_URI) {
    return;
  }

  await FileSystem.writeAsStringAsync(SCHOLARSHIPS_FILE_URI, serialized);
}

async function readScholarships(): Promise<SavedScholarship[]> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const value = localStorage.getItem(SAVED_SCHOLARSHIPS_STORAGE_KEY);
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as SavedScholarship[];
      return dedupeScholarships(Array.isArray(parsed) ? parsed : []);
    } catch {
      return [];
    }
  }

  if (!SCHOLARSHIPS_FILE_URI) {
    return [];
  }

  const info = await FileSystem.getInfoAsync(SCHOLARSHIPS_FILE_URI);
  if (!info.exists) {
    return [];
  }

  try {
    const value = await FileSystem.readAsStringAsync(SCHOLARSHIPS_FILE_URI);
    const parsed = JSON.parse(value) as SavedScholarship[];
    return dedupeScholarships(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export async function getSavedScholarships(): Promise<SavedScholarship[]> {
  return readScholarships();
}

export async function setSavedScholarships(items: SavedScholarship[]): Promise<void> {
  await writeScholarships(items);
}

export function isScholarshipSaved(
  savedScholarships: SavedScholarship[],
  scholarship: ScholarshipOpportunity,
  collegeName: string,
): boolean {
  const targetKey = scholarshipDedupKey({ ...scholarship, collegeName });
  return savedScholarships.some((saved) => scholarshipDedupKey(saved) === targetKey);
}

export function saveScholarship(
  savedScholarships: SavedScholarship[],
  scholarship: ScholarshipOpportunity,
  collegeName: string,
): SavedScholarship[] {
  if (isScholarshipSaved(savedScholarships, scholarship, collegeName)) {
    return savedScholarships;
  }

  const savedItem: SavedScholarship = {
    ...scholarship,
    savedAt: new Date().toISOString(),
    collegeName,
  };

  return dedupeScholarships([savedItem, ...savedScholarships]);
}

export function removeScholarship(
  savedScholarships: SavedScholarship[],
  scholarship: Pick<ScholarshipOpportunity, 'name' | 'provider' | 'apply_url'> | SavedScholarship,
  collegeName?: string,
): SavedScholarship[] {
  const resolvedCollegeName =
    'collegeName' in scholarship ? scholarship.collegeName : (collegeName || '');

  const targetKey = scholarshipDedupKey({
    name: scholarship.name,
    provider: scholarship.provider,
    apply_url: scholarship.apply_url,
    collegeName: resolvedCollegeName,
  });

  return savedScholarships.filter((saved) => scholarshipDedupKey(saved) !== targetKey);
}
