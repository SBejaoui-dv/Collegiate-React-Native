import { SearchFilters } from '@/app/features/search/types/search.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

type ApiCollege = {
  id?: number;
  latest?: {
    school?: {
      name?: string;
      city?: string;
      state?: string;
      school_url?: string;
      online_only?: number;
    };
    student?: {
      size?: number;
    };
    admissions?: {
      admission_rate?: {
        overall?: number;
      };
      sat_scores?: {
        percentile_75?: {
          critical_reading?: number;
          math?: number;
        };
      };
      act_scores?: {
        percentile_75?: {
          cumulative?: number;
        };
      };
    };
    cost?: {
      tuition?: {
        in_state?: number;
        out_of_state?: number;
      };
    };
  };
};

type ApiResponse = {
  results?: ApiCollege[];
};

export async function searchColleges(filters: SearchFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.append('name', filters.query.trim());
  }

  if (filters.state.trim()) {
    params.append('state', filters.state.trim().toUpperCase());
  }

  if (filters.onlineOnly) {
    params.append('online_only', 'true');
  }

  params.append('sort_by', filters.sortBy);
  params.append('sort_order', filters.sortOrder);

  const response = await fetch(`${API_URL}/api/college/search?${params.toString()}`, {
    method: 'GET',
    signal,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse | null;

  if (!response.ok) {
    throw new Error(`Search failed (${response.status}).`);
  }

  return payload?.results ?? [];
}
