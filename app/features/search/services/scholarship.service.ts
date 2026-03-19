import { ScholarshipOpportunity, ScholarshipResources } from '@/app/features/search/types/scholarship.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

type ListScholarshipsParams = {
  schoolName: string;
  state?: string;
  schoolUrl?: string;
  query?: string;
};

type ListScholarshipsResponse = {
  scholarships?: ScholarshipOpportunity[];
  resources?: ScholarshipResources;
};

export async function listScholarships(params: ListScholarshipsParams): Promise<{
  scholarships: ScholarshipOpportunity[];
  resources: ScholarshipResources;
}> {
  const search = new URLSearchParams();
  search.append('school_name', params.schoolName);

  if (params.state?.trim()) {
    search.append('state', params.state.trim().toUpperCase());
  }

  if (params.schoolUrl?.trim()) {
    search.append('school_url', params.schoolUrl.trim());
  }

  if (params.query?.trim()) {
    search.append('q', params.query.trim());
  }

  const response = await fetch(`${API_URL}/api/scholarships/list?${search.toString()}`, {
    method: 'GET',
  });

  const payload = (await response.json().catch(() => null)) as ListScholarshipsResponse | null;

  if (!response.ok) {
    throw new Error('Failed to load scholarships.');
  }

  return {
    scholarships: payload?.scholarships ?? [],
    resources: payload?.resources ?? {},
  };
}
