export type ScholarshipOpportunity = {
  id: string;
  name: string;
  provider: string;
  amount: string;
  deadline: string;
  description: string;
  eligibility: string;
  apply_url: string;
};

export type SavedScholarship = ScholarshipOpportunity & {
  savedAt: string;
  collegeName: string;
};

export type ScholarshipResources = {
  school_website_url?: string | null;
  school_scholarship_page_url?: string | null;
  school_financial_aid_page_url?: string | null;
  school_scholarship_direct_url?: string | null;
  school_financial_aid_direct_url?: string | null;
};
