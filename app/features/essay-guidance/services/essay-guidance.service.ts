import {
  EssayGrade,
  OutlineResponses,
  OutlineResult,
} from '@/app/features/essay-guidance/types/essay-guidance.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

export async function generateOutline(responses: OutlineResponses): Promise<OutlineResult> {
  const response = await fetch(`${API_URL}/api/openai/generate-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(responses),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.outline) {
    throw new Error(payload?.error || 'Failed to generate outline.');
  }

  return payload.outline as OutlineResult;
}

export async function gradeEssay(essay: string, context?: string): Promise<EssayGrade> {
  const response = await fetch(`${API_URL}/api/openai/grade-essay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      essay,
      context,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error(payload?.error || 'Failed to grade essay.');
  }

  return payload as EssayGrade;
}
