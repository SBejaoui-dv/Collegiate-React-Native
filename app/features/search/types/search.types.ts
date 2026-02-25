export type SortBy = 'name' | 'acceptance' | 'tuition_in_state' | 'student_size';

export type SortOrder = 'asc' | 'desc';

export type SearchFilters = {
  query: string;
  state: string;
  onlineOnly: boolean;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

export type College = {
  id: number;
  name: string;
  city: string;
  state: string;
  website?: string;
  logoUrl?: string;
  acceptanceRate: number | null;
  studentSize: number | null;
  tuitionInState: number | null;
  tuitionOutOfState: number | null;
  sat75th: number | null;
  act75th: number | null;
  onlineOnly: boolean;
};
