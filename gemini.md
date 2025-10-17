
# Gemini Codebase Context

This document provides a high-level overview of the Web QA Tool codebase to help Large Language Models (LLMs) like Gemini understand the project's context, technologies, and structure.

## Project Overview

The **Web QA Tool** is a Next.js application designed for automated website quality assurance. It allows users to input a list of URLs and perform various tests, including:

-   **Visual Comparison:** Captures screenshots of URLs with and without the `?d_alpha=true` query parameter for visual regression testing.
-   **Broken Link Checking:** Identifies broken links on a page.
-   **Image Alt Text Analysis:** Checks for missing or empty alt attributes in images.
-   **Word Search:** Counts the occurrences of specific keywords on a page.
-   **Accessibility, Performance, and SEO Audits:** (Currently disabled but intended) using Lighthouse.

The application is built with a modern tech stack and is optimized for deployment on GitHub Pages.

## Technology Stack

-   **Framework:** [Next.js](https://nextjs.org/) 15 (with App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **UI Components:** [Radix UI](https://www.radix-ui.com/) and [shadcn/ui](https://ui.shadcn.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Browser Automation:** [Playwright](https://playwright.dev/)
-   **Linting:** [ESLint](https://eslint.org/)
-   **Package Manager:** [pnpm](https://pnpm.io/)

## Project Structure

The project follows a standard Next.js App Router structure:

```
/
├── app/
│   ├── page.tsx          # Main QA tool interface and frontend logic
│   ├── actions.ts        # Server-side actions for running QA checks
│   └── layout.tsx        # Root layout for the application
├── components/
│   ├── ui/               # Reusable UI components from shadcn/ui
│   └── theme-provider.tsx# Theme provider for light/dark mode
├── pages/api/
│   └── runQAChecks.ts    # API route for handling QA checks (backend logic)
├── public/               # Static assets
├── README.md             # Project documentation
├── package.json          # Project dependencies and scripts
├── next.config.mjs       # Next.js configuration
└── tsconfig.json         # TypeScript configuration
```

## Key Files and Logic

### `app/page.tsx`

-   This is the main entry point for the user interface.
-   It uses React state (`useState`) to manage the list of URLs, selected checks, and results.
-   The `handleRunChecks` function orchestrates the QA process by calling the `runQAChecks` server action for each URL.
-   It displays the results, including screenshots and lists of issues, in a user-friendly format.

### `app/actions.ts`

-   This file contains the `runQAChecks` server action, which is the bridge between the frontend and the backend QA logic.
-   It receives the URL, selected checks, and other parameters from the frontend.
-   It uses Playwright to launch a browser, navigate to the URL, and perform the requested checks.
-   It communicates with the frontend by streaming updates using the `onUpdate` callback.

### `pages/api/runQAChecks.ts`

-   This file contains the core backend logic for the QA checks.
-   It uses Playwright to perform actions like taking screenshots, finding broken links, and checking for image alt tags.
-   The `checkImageAltTags` function uses `page.evaluate` to run JavaScript in the browser context to find images with missing alt text.
-   The `checkBrokenLinks` function fetches all links on the page and checks their HTTP status.
-   It also includes (currently disabled) logic for running Lighthouse audits.

## How to Run the Application

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
2.  **Run the development server:**
    ```bash
    pnpm run dev
    ```
3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Run QA Checks

1.  Enter one or more URLs in the text area.
2.  Select the desired QA checks (e.g., "Broken Links", "Image Alt Tags").
3.  Click the "Run QA Checks" button.
4.  The results will be displayed on the page as they become available.
