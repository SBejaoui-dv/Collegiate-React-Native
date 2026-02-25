import { useCallback, useEffect, useRef, useState } from 'react';

import { mockColleges } from '@/app/features/search/data/mock-colleges';
import { searchColleges } from '@/app/features/search/services/search.service';
import { College, SearchFilters } from '@/app/features/search/types/search.types';

type SearchState = {
  colleges: College[];
  isLoading: boolean;
  error: string | null;
};

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

function compareNumbers(a: number | null, b: number | null, order: 'asc' | 'desc') {
  const aValue = a ?? Number.POSITIVE_INFINITY;
  const bValue = b ?? Number.POSITIVE_INFINITY;

  return order === 'asc' ? aValue - bValue : bValue - aValue;
}

function buildLogoUrl(website?: string) {
  if (!website) {
    return undefined;
  }

  const domain = website
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();

  if (!domain) {
    return undefined;
  }

  // Google favicon endpoint is more stable for broad domain coverage.
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function hasSufficientData(college: College, filters: SearchFilters) {
  const keyMetrics = [
    college.acceptanceRate,
    college.studentSize,
    college.tuitionInState,
    college.sat75th,
    college.act75th,
  ];
  const presentCount = keyMetrics.filter((metric) => metric !== null).length;

  // Keep quality filtering, but be less strict when a state is selected.
  // This avoids over-pruning state-specific results where some metrics are sparse.
  const minimumRequired = filters.state ? 2 : 3;
  return presentCount >= minimumRequired;
}

function normalizeCollege(apiCollege: ApiCollege): College | null {
  const school = apiCollege.latest?.school;
  const admissions = apiCollege.latest?.admissions;
  const cost = apiCollege.latest?.cost;

  if (!apiCollege.id || !school?.name) {
    return null;
  }

  const satReading = admissions?.sat_scores?.percentile_75?.critical_reading ?? 0;
  const satMath = admissions?.sat_scores?.percentile_75?.math ?? 0;
  const sat75th = satReading > 0 || satMath > 0 ? satReading + satMath : null;

  return {
    id: apiCollege.id,
    name: school.name,
    city: school.city ?? '',
    state: school.state ?? '',
    website: school.school_url,
    logoUrl: buildLogoUrl(school.school_url),
    acceptanceRate: admissions?.admission_rate?.overall ?? null,
    studentSize: apiCollege.latest?.student?.size ?? null,
    tuitionInState: cost?.tuition?.in_state ?? null,
    tuitionOutOfState: cost?.tuition?.out_of_state ?? null,
    sat75th,
    act75th: admissions?.act_scores?.percentile_75?.cumulative ?? null,
    onlineOnly: school.online_only === 1,
  };
}

function sortColleges(colleges: College[], filters: SearchFilters) {
  return [...colleges].sort((a, b) => {
    if (filters.sortBy === 'name') {
      return filters.sortOrder === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }

    if (filters.sortBy === 'acceptance') {
      return compareNumbers(a.acceptanceRate, b.acceptanceRate, filters.sortOrder);
    }

    if (filters.sortBy === 'tuition_in_state') {
      return compareNumbers(a.tuitionInState, b.tuitionInState, filters.sortOrder);
    }

    return compareNumbers(a.studentSize, b.studentSize, filters.sortOrder);
  });
}

function filterMockColleges(filters: SearchFilters) {
  const query = filters.query.trim().toLowerCase();

  const filtered = mockColleges
    .map((college) => ({
      ...college,
      logoUrl: college.logoUrl ?? buildLogoUrl(college.website),
    }))
    .filter((college) => {
      const matchesQuery =
        !query ||
        college.name.toLowerCase().includes(query) ||
        college.city.toLowerCase().includes(query) ||
        college.state.toLowerCase().includes(query);

    const matchesState = !filters.state || college.state === filters.state;
    const matchesOnline = !filters.onlineOnly || college.onlineOnly;

      return matchesQuery && matchesState && matchesOnline && hasSufficientData(college, filters);
    });

  return sortColleges(filtered, filters);
}

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  );
}

export function useCollegeSearch(filters: SearchFilters) {
  const [state, setState] = useState<SearchState>({
    colleges: [],
    isLoading: false,
    error: null,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState((previous) => ({ ...previous, isLoading: true, error: null }));

    try {
      const apiResults = await searchColleges(filters, abortController.signal);
      const normalized = apiResults
        .map(normalizeCollege)
        .filter((college): college is College => !!college)
        .filter((college) => hasSufficientData(college, filters));
      const sorted = sortColleges(normalized, filters);

      setState({
        colleges: sorted,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      const fallback = filterMockColleges(filters);
      setState({
        colleges: fallback,
        isLoading: false,
        error: null,
      });
    }
  }, [filters]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      void runSearch();
    }, 350);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [runSearch]);

  return {
    ...state,
    totalCount: state.colleges.length,
    retrySearch: runSearch,
  };
}

export function formatMoney(value: number | null) {
  if (value === null) {
    return 'N/A';
  }

  return `$${value.toLocaleString()}`;
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return 'N/A';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(value: number | null) {
  if (value === null) {
    return 'N/A';
  }

  return value.toLocaleString();
}

export type { College };
