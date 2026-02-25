export type EssayGrade = {
  score: number;
  summary: string;
  rubric_scores: {
    [key: string]: {
      score: number;
      reason: string;
    };
  };
  strengths: string[];
  weaknesses: string[];
  priority_fixes: {
    issue: string;
    why_it_matters: string;
    how_to_fix: string;
    before_example: string;
    after_example: string;
  }[];
  meta: {
    word_count: number;
    char_count: number;
  };
};

export type OutlineResponses = {
  aboutYourself: string;
  uniqueQuality: string;
  storyAboutLovedOne: string;
  collegeInfo: string;
};

export type OutlineResult = {
  introduction: string;
  uniqueTrait: string;
  story: string;
  collegeGoal: string;
  aiOutline: string;
};
