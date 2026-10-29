import { UserProfile, StylingResult } from "../types";

export async function generateStylingAdvice(profile: UserProfile): Promise<StylingResult> {
  const response = await fetch('/api/generate-advice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Advice generation failed with status ${response.status}`);
  }

  const advice: StylingResult = await response.json();
  return advice;
}

export async function generateStylingImage(profile: UserProfile, advice: StylingResult): Promise<string> {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profile, advice }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Image generation failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.imageUrl) {
    throw new Error('Image generation did not return an image URL.');
  }

  return data.imageUrl;
}
