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
  // Refactored: Return mock data for static export compatibility
  // Note: Playwright cannot run in the browser. For static export, only static or mock data can be returned.
  // You must use a third-party API, or remove this feature for static hosting.
  // Here, we return a mock result for demonstration.

  // Simulate a delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create mock word count data
  const wordCount: { [word: string]: number } = {};
  searchWords.forEach(word => {
    wordCount[word] = Math.floor(Math.random() * 10) + 1;
  });

  return {
    url,
    timestamp: new Date().toISOString(),
    screenshots: {
      desktop: `https://api.screenshotmachine.com/?key=697a9c&url=${encodeURIComponent(url)}&dimension=1920x1080`,
      tablet: `https://api.screenshotmachine.com/?key=697a9c&url=${encodeURIComponent(url)}&dimension=768x1024`,
      mobile: `https://api.screenshotmachine.com/?key=697a9c&url=${encodeURIComponent(url)}&dimension=375x667`
    },
    checks: {
      accessibility: {
        passed: true,
        issues: [],
        score: 95
      },
      performance: {
        passed: true,
        metrics: {
          loadTime: 1000,
          firstContentfulPaint: 500,
          largestContentfulPaint: 800,
          cumulativeLayoutShift: 0.01
        },
        score: 92
      },
      seo: {
        passed: true,
        issues: [],
        score: 88
      },
      brokenLinks: {
        passed: true,
        brokenLinks: [],
        totalLinks: 10
      },
      images: {
        passed: true,
        issues: [],
        totalImages: 5
      },
      wordCount: wordCount
    },
    overallScore: 92
  };
}
