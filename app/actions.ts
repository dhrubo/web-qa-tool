/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */

interface CheckConfig {
  accessibility: boolean
  performance: boolean
  seo: boolean
  brokenLinks: boolean
  images: boolean
  wordCount: boolean
}

export async function runQAChecks(url: string, checks: CheckConfig, searchWords: string[]) {
  const response = await fetch('/api/runQAChecks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, checks, searchWords }),
  });

  if (!response.ok) {
    throw new Error(`Failed to run QA checks: ${response.statusText}`);
  }

  return response.json();
}
