"use server"

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
  // Dynamically load Playwright. Keeping it out of the static bundle avoids
  // the “playwright-core … package.json?module” resolution error.
  // @ts-ignore
  const { chromium } = (await import("playwright")) as typeof import("playwright")

  const browser = await chromium.launch()
  const context = await browser.newContext()

  try {
    // Create a new page
    const page = await context.newPage()

    // Navigate to the URL
    const startTime = Date.now()
    await page.goto(url, { waitUntil: "networkidle" })
    const loadTime = Date.now() - startTime

    // Capture screenshots at different breakpoints
    const screenshots = await captureScreenshots(page)

    // Initialize results
    const result = {
      url,
      timestamp: new Date().toISOString(),
      screenshots,
      checks: {
        accessibility: {
          passed: true,
          issues: [] as Array<{
            type: string
            element: string
            message: string
            severity: "error" | "warning" | "info"
          }>,
          score: 100
        },
        performance: {
          passed: true,
          metrics: {
            loadTime,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
          },
          score: 100,
        },
        seo: {
          passed: true,
          issues: [] as Array<{
            type: string
            message: string
            severity: "error" | "warning" | "info"
          }>,
          score: 100
        },
        brokenLinks: {
          passed: true,
          brokenLinks: [] as Array<{
            url: string
            status: number
            text: string
          }>,
          totalLinks: 0
        },
        images: {
          passed: true,
          issues: [] as Array<{
            src: string
            issue: string
            severity: "error" | "warning" | "info"
          }>,
          totalImages: 0
        },
        wordCount: {} as { [key: string]: number },
      },
      overallScore: 100,
    }

    // Run accessibility checks
    if (checks.accessibility) {
      result.checks.accessibility = await runAccessibilityChecks(page)
    }

    // Run performance checks
    if (checks.performance) {
      result.checks.performance = await runPerformanceChecks(page, loadTime)
    }

    // Run SEO checks
    if (checks.seo) {
      result.checks.seo = await runSEOChecks(page)
    }

    // Run broken links check
    if (checks.brokenLinks) {
      result.checks.brokenLinks = await runBrokenLinksCheck(page)
    }

    // Run image checks
    if (checks.images) {
      result.checks.images = await runImageChecks(page)
    }

    // Run word count
    if (checks.wordCount && searchWords.length > 0) {
      result.checks.wordCount = await runWordCount(page, searchWords)
    }

    // Calculate overall score
    result.overallScore = calculateOverallScore(result.checks)

    return result
  } finally {
    await browser.close()
  }
}

async function captureScreenshots(page: any) {
  const screenshots = {
    desktop: "",
    tablet: "",
    mobile: "",
  }

  // Desktop screenshot
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.waitForTimeout(1000)
  const desktopBuffer = await page.screenshot({ fullPage: true })
  screenshots.desktop = `data:image/png;base64,${desktopBuffer.toString("base64")}`

  // Tablet screenshot
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForTimeout(1000)
  const tabletBuffer = await page.screenshot({ fullPage: true })
  screenshots.tablet = `data:image/png;base64,${tabletBuffer.toString("base64")}`

  // Mobile screenshot
  await page.setViewportSize({ width: 375, height: 667 })
  await page.waitForTimeout(1000)
  const mobileBuffer = await page.screenshot({ fullPage: true })
  screenshots.mobile = `data:image/png;base64,${mobileBuffer.toString("base64")}`

  return screenshots
}

async function runAccessibilityChecks(page: any) {
  const issues = []
  let score = 100

  try {
    // Check for missing alt text
    const imagesWithoutAlt = await page.$$eval("img", (imgs: HTMLImageElement[]) =>
      imgs
        .filter((img) => !img.alt || img.alt.trim() === "")
        .map((img) => ({
          src: img.src,
          tagName: img.tagName,
        })),
    )

    imagesWithoutAlt.forEach((img: { src: string; tagName: string }) => {
      issues.push({
        type: "Missing Alt Text",
        element: `<img src="${img.src}">`,
        message: "Image is missing alternative text for screen readers",
        severity: "error" as const,
      })
      score -= 5
    })

    // Check for missing form labels
    const inputsWithoutLabels = await page.$$eval(
      'input[type="text"], input[type="email"], input[type="password"], textarea',
      (inputs: HTMLInputElement[]) =>
        inputs
          .filter((input) => {
            const id = input.id
            const hasLabel = id && document.querySelector(`label[for="${id}"]`)
            const hasAriaLabel = input.getAttribute("aria-label")
            return !hasLabel && !hasAriaLabel
          })
          .map((input) => ({
            type: input.type,
            id: input.id || "no-id",
            tagName: input.tagName,
          })),
    )

    inputsWithoutLabels.forEach((input: { type: string; id: string; tagName: string }) => {
      issues.push({
        type: "Missing Form Label",
        element: `<${input.tagName.toLowerCase()} type="${input.type}" id="${input.id}">`,
        message: "Form input is missing an associated label",
        severity: "error" as const,
      })
      score -= 8
    })

    // Check for heading structure
    const headings = await page.$$eval("h1, h2, h3, h4, h5, h6", (headings: HTMLHeadingElement[]) =>
      headings.map((h) => ({ level: Number.parseInt(h.tagName[1]), text: h.textContent?.slice(0, 50) || "" })),
    )

    if (headings.length === 0) {
      issues.push({
        type: "No Headings",
        element: "document",
        message: "Page has no heading elements for proper document structure",
        severity: "warning" as const,
      })
      score -= 10
    } else {
      const h1Count = headings.filter((h: { level: number; text: string }) => h.level === 1).length
      if (h1Count === 0) {
        issues.push({
          type: "Missing H1",
          element: "document",
          message: "Page is missing a main heading (h1)",
          severity: "error" as const,
        })
        score -= 15
      } else if (h1Count > 1) {
        issues.push({
          type: "Multiple H1",
          element: "document",
          message: "Page has multiple h1 elements, should have only one",
          severity: "warning" as const,
        })
        score -= 5
      }
    }

    // Check for color contrast (simplified check)
    const lowContrastElements = await page.$$eval("*", (elements: Element[]) => {
      const results = []
      for (const el of elements) {
        const style = window.getComputedStyle(el)
        const color = style.color
        const backgroundColor = style.backgroundColor

        if (color && backgroundColor && color !== "rgba(0, 0, 0, 0)" && backgroundColor !== "rgba(0, 0, 0, 0)") {
          // Simplified contrast check - in reality you'd use a proper contrast ratio calculation
          if (color === backgroundColor) {
            results.push({
              tagName: el.tagName,
              text: el.textContent?.slice(0, 30) || "",
            })
          }
        }
      }
      return results.slice(0, 5) // Limit results
    })

    lowContrastElements.forEach((el: { tagName: string; text: string }) => {
      issues.push({
        type: "Low Color Contrast",
        element: `<${el.tagName.toLowerCase()}>`,
        message: "Element may have insufficient color contrast",
        severity: "warning" as const,
      })
      score -= 3
    })
  } catch (error) {
    console.error("Accessibility check error:", error)
  }

  return {
    passed: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    score: Math.max(0, score),
  }
}

async function runPerformanceChecks(page: any, loadTime: number) {
  let score = 100

  // Basic performance scoring based on load time
  if (loadTime > 3000) score -= 30
  else if (loadTime > 2000) score -= 20
  else if (loadTime > 1000) score -= 10

  // Get performance metrics
  const metrics = await page.evaluate(() => {
    // const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming
    return {
      firstContentfulPaint: 0, // Would need more complex setup to get real FCP
      largestContentfulPaint: 0, // Would need more complex setup to get real LCP
      cumulativeLayoutShift: 0, // Would need more complex setup to get real CLS
    }
  })

  return {
    passed: loadTime < 3000,
    metrics: {
      loadTime,
      ...metrics,
    },
    score: Math.max(0, score),
  }
}

async function runSEOChecks(page: any) {
  const issues = []
  let score = 100

  try {
    // Check for title tag
    const title = await page.$eval("title", (el: HTMLTitleElement) => el.textContent).catch(() => null)
    if (!title) {
      issues.push({
        type: "Missing Title",
        message: "Page is missing a title tag",
        severity: "error" as const,
      })
      score -= 20
    } else if (title.length < 30 || title.length > 60) {
      issues.push({
        type: "Title Length",
        message: `Title should be 30-60 characters (current: ${title.length})`,
        severity: "warning" as const,
      })
      score -= 5
    }

    // Check for meta description
    const metaDescription = await page
      .$eval('meta[name="description"]', (el: HTMLMetaElement) => el.content)
      .catch(() => null)
    if (!metaDescription) {
      issues.push({
        type: "Missing Meta Description",
        message: "Page is missing a meta description",
        severity: "error" as const,
      })
      score -= 15
    } else if (metaDescription.length < 120 || metaDescription.length > 160) {
      issues.push({
        type: "Meta Description Length",
        message: `Meta description should be 120-160 characters (current: ${metaDescription.length})`,
        severity: "warning" as const,
      })
      score -= 5
    }

    // Check for canonical URL
    const canonical = await page.$eval('link[rel="canonical"]', (el: HTMLLinkElement) => el.href).catch(() => null)
    if (!canonical) {
      issues.push({
        type: "Missing Canonical URL",
        message: "Page is missing a canonical URL",
        severity: "warning" as const,
      })
      score -= 5
    }

    // Check for Open Graph tags
    const ogTitle = await page.$eval('meta[property="og:title"]', (el: HTMLMetaElement) => el.content).catch(() => null)
    const ogDescription = await page
      .$eval('meta[property="og:description"]', (el: HTMLMetaElement) => el.content)
      .catch(() => null)

    if (!ogTitle || !ogDescription) {
      issues.push({
        type: "Missing Open Graph Tags",
        message: "Page is missing Open Graph title or description",
        severity: "info" as const,
      })
      score -= 3
    }
  } catch (error) {
    console.error("SEO check error:", error)
  }

  return {
    passed: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    score: Math.max(0, score),
  }
}

async function runBrokenLinksCheck(page: any) {
  const brokenLinks = []

  try {
    const links = await page.$$eval("a[href]", (anchors: HTMLAnchorElement[]) =>
      anchors
        .map((a) => ({
          url: a.href,
          text: a.textContent?.trim() || "",
        }))
        .filter((link) => link.url.startsWith("http")),
    )

    // Check a sample of links (limit to prevent timeout)
    const linksToCheck = links.slice(0, 10)

    for (const link of linksToCheck) {
      try {
        const response = await fetch(link.url, { method: "HEAD" })
        if (!response.ok) {
          brokenLinks.push({
            url: link.url,
            status: response.status,
            text: link.text,
          })
        }
      } catch (error) {
        brokenLinks.push({
          url: link.url,
          status: 0,
          text: link.text,
        })
      }
    }

    return {
      passed: brokenLinks.length === 0,
      brokenLinks,
      totalLinks: links.length,
    }
  } catch (error) {
    console.error("Broken links check error:", error)
    return {
      passed: true,
      brokenLinks: [],
      totalLinks: 0,
    }
  }
}

async function runImageChecks(page: any) {
  const issues: Array<{
    src: string
    issue: string
    severity: "error" | "warning" | "info"
  }> = []

  try {
    const images = await page.$$eval("img", (imgs: HTMLImageElement[]) =>
      imgs.map((img) => ({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight,
        loading: img.loading,
      })),
    )

    images.forEach((img: { src: string; alt: string; width: number; height: number; loading: string }) => {
      // Check for missing alt text
      if (!img.alt || img.alt.trim() === "") {
        issues.push({
          src: img.src,
          issue: "Missing alt text",
          severity: "error" as const,
        })
      }

      // Check for large images (simplified check)
      if (img.width > 2000 || img.height > 2000) {
        issues.push({
          src: img.src,
          issue: "Image may be too large (>2000px)",
          severity: "warning" as const,
        })
      }

      // Check for lazy loading
      if (!img.loading || img.loading !== "lazy") {
        issues.push({
          src: img.src,
          issue: "Image not using lazy loading",
          severity: "info" as const,
        })
      }
    })

    return {
      passed: issues.filter((i) => i.severity === "error").length === 0,
      issues,
      totalImages: images.length,
    }
  } catch (error) {
    console.error("Image check error:", error)
    return {
      passed: true,
      issues: [],
      totalImages: 0,
    }
  }
}

async function runWordCount(page: any, searchWords: string[]) {
  try {
    const wordCounts = await page.evaluate((words: string[]) => {
      const text = document.body.textContent?.toLowerCase() || ""
      const counts: { [key: string]: number } = {}

      words.forEach((word) => {
        const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, "g")
        const matches = text.match(regex)
        counts[word] = matches ? matches.length : 0
      })

      return counts
    }, searchWords)

    return wordCounts
  } catch (error) {
    console.error("Word count error:", error)
    return {}
  }
}

function calculateOverallScore(checks: any) {
  const scores = [checks.accessibility.score, checks.performance.score, checks.seo.score]

  // Add penalty for broken links and image issues
  if (checks.brokenLinks.brokenLinks.length > 0) {
    scores.push(Math.max(0, 100 - checks.brokenLinks.brokenLinks.length * 10))
  } else {
    scores.push(100)
  }

  if (checks.images.issues.filter((i: any) => i.severity === "error").length > 0) {
    scores.push(Math.max(0, 100 - checks.images.issues.length * 5))
  } else {
    scores.push(100)
  }

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}
