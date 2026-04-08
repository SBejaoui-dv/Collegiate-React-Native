import { ResumeFeedbackResponse } from '@/app/features/resume-guidance/types/resume-guidance.types';
import { getAccessToken } from '@/app/features/auth/services/auth.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

async function withAuthHeaders(contentType = true) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be logged in to use AI features.');
  }

  if (contentType) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function analyzeResumeText(resumeText: string): Promise<ResumeFeedbackResponse> {
  const headers = await withAuthHeaders(true);
  const response = await fetch(`${API_URL}/api/openai/analyze-resume`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ resume_text: resumeText }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.feedback) {
    throw new Error(payload?.error || 'Failed to analyze resume.');
  }

  return payload as ResumeFeedbackResponse;
}

export async function uploadResumeFile(file: {
  uri: string;
  name: string;
  mimeType?: string;
  webFile?: File;
}): Promise<ResumeFeedbackResponse> {
  const headers = await withAuthHeaders(false);
  const formData = new FormData();
  if (file.webFile) {
    formData.append('resume', file.webFile);
  } else {
    formData.append(
      'resume',
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any
    );
  }

  const response = await fetch(`${API_URL}/api/openai/upload-resume`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.feedback) {
    throw new Error(payload?.error || 'Failed to upload resume.');
  }

  return payload as ResumeFeedbackResponse;
}
