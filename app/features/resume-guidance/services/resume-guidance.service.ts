import { ResumeFeedbackResponse } from '@/app/features/resume-guidance/types/resume-guidance.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

export async function analyzeResumeText(resumeText: string): Promise<ResumeFeedbackResponse> {
  const response = await fetch(`${API_URL}/api/openai/analyze-resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.feedback) {
    throw new Error(payload?.error || 'Failed to upload resume.');
  }

  return payload as ResumeFeedbackResponse;
}
