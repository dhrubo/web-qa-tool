# Web QA Tool

A comprehensive **Web Quality Assurance (QA) Tool** built with Next.js that performs automated website testing and analysis. This tool helps developers, QA engineers, and web professionals identify and fix various website issues including accessibility violations, performance bottlenecks, broken links, SEO problems, and more.

## 🎯 What This Tool Does

### Core Features

#### 🔍 Multi-Device Visual Testing

- Captures screenshots across different viewports (Desktop: 1920x1080, Tablet: 768x1024, Mobile: 375x667)
- Uses ScreenshotMachine API for consistent visual testing across devices
- Helps identify responsive design issues and layout problems

#### ♿ Accessibility Testing

- Integrates with aXe API to detect WCAG compliance violations
- Identifies issues like missing alt text, color contrast problems, keyboard navigation issues
- Checks for proper ARIA labels and semantic HTML structure
- Provides severity ratings (error, warning, info) and actionable recommendations

#### 🔗 Broken Link Detection

- Validates URL formats and checks for common typos in domain names
- Tests HTTP/HTTPS protocol variations and www/non-www versions
- Performs network connectivity tests to identify dead links
- Detects missing protocols and malformed URLs

#### 🚀 Performance Monitoring

- Tracks Core Web Vitals including First Contentful Paint, Largest Contentful Paint
- Measures Cumulative Layout Shift and overall load times
- Provides performance scores and optimization suggestions
- Monitors resource loading and rendering metrics

#### 🔎 SEO Analysis

- Performs basic SEO compliance checks
- Identifies missing meta tags, improper heading structure
- Analyzes page titles, descriptions, and semantic markup
- Provides SEO scores and improvement recommendations

#### 🖼️ Image Optimization Checks

- Analyzes image-related performance issues
- Checks for missing alt attributes and proper image formats
- Identifies oversized images and optimization opportunities

#### 📝 Word Search & Content Analysis

- Searches for specific keywords or phrases on web pages
- Provides occurrence counts for targeted content analysis
- Useful for content audits and keyword density analysis

### Technical Stack

- **Framework**: Next.js 15 with TypeScript for type safety and modern React features
- **UI Components**: Radix UI component library with Tailwind CSS for responsive design
- **Testing Engine**: Playwright integration for browser automation
- **APIs**: Multiple third-party integrations (ScreenshotMachine, aXe Accessibility API)
- **Deployment**: Optimized for static export and GitHub Pages deployment

### Use Cases

- **Quality Assurance**: Automated testing workflows for web applications
- **Accessibility Compliance**: WCAG 2.1 compliance checking for inclusive design
- **Performance Optimization**: Identifying and fixing website speed issues
- **SEO Auditing**: Ensuring proper search engine optimization
- **Content Management**: Keyword tracking and content analysis
- **Responsive Design Testing**: Cross-device compatibility verification

## How to Use

1. **Enter URLs**: Add one or more URLs to test (one per line)
2. **Select Word Search**: Optionally specify keywords to search for and count
3. **Choose Tests**: Select which QA checks to run:
   - ✅ Accessibility testing (WCAG compliance)
   - ✅ Performance monitoring (Core Web Vitals)
   - ✅ SEO analysis
   - ✅ Broken link detection
   - ✅ Image optimization checks
   - ✅ Word counting and content analysis
4. **Run Analysis**: Click "Run QA Checks" to start automated testing
5. **Review Results**: View detailed reports with scores, issues, and recommendations

## Key Features Breakdown

### Automated Testing Suite

- **Multi-URL Support**: Test multiple websites simultaneously
- **Progress Tracking**: Real-time progress indicators during testing
- **Comprehensive Scoring**: Overall quality scores with detailed breakdowns

### Accessibility Compliance

- **WCAG 2.1 Standards**: Automated accessibility testing using industry-standard tools
- **Issue Classification**: Problems categorized by severity (error, warning, info)
- **Element Targeting**: Specific DOM elements identified for easy fixing

### Performance Analysis

- **Core Web Vitals**: Measures Google's key performance metrics
- **Load Time Analysis**: Detailed timing breakdowns for optimization
- **Mobile-First**: Performance tested across all device types

### Visual Testing

- **Cross-Device Screenshots**: Automatic captures across desktop, tablet, and mobile
- **Responsive Design Validation**: Identify layout issues across viewports
- **Visual Regression Detection**: Compare designs across different screen sizes

## Architecture Overview

```text
├── app/
│   ├── page.tsx          # Main QA tool interface
│   ├── actions.ts        # Server actions for QA checks
│   └── layout.tsx        # Application layout
├── components/
│   ├── ui/              # Reusable UI components (Radix UI)
│   └── theme-provider.tsx
├── lib/
│   └── utils.ts         # Utility functions
└── pages/api/           # API routes (for future enhancements)
```

### Technology Stack Details

- **Frontend**: React 18 with Next.js 15 App Router
- **Styling**: Tailwind CSS with custom component variants
- **UI Library**: Radix UI primitives for accessibility-first components
- **TypeScript**: Full type safety across the application
- **Browser Testing**: Playwright for automated browser interactions
- **State Management**: React hooks with TypeScript interfaces
- **Build System**: Next.js with static export optimization

## Prerequisites

- [Node.js](https://nodejs.org/) (recommended version: 18.x or 20.x)
- [pnpm](https://pnpm.io/) (install with `npm install -g pnpm`)
- [Git](https://git-scm.com/)

## Getting Started

1. **Clone the repository:**

   ```sh
   git clone https://github.com/dhrubo/web-qa-tool.git
   cd web-qa-tool
   ```

2. **Install dependencies:**

   ```sh
   pnpm install
   ```

3. **Run the development server:**

   ```sh
   pnpm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the app.

4. **Lint the code (optional):**

   ```sh
   pnpm run lint
   ```

5. **Build the project:**

   ```sh
   pnpm run build
   ```

6. **Export static site:**

   ```sh
   pnpm run export
   ```

   The static site will be generated in the `out` directory.

## Deployment to GitHub Pages

1. **Deploy:**

   ```sh
   pnpm run deploy
   ```

   This will export the site, add a `.nojekyll` file, and publish the `out` directory to the `gh-pages` branch.

2. **Access your site:**
   Visit [https://dhrubo.github.io/web-qa-tool](https://dhrubo.github.io/web-qa-tool)

## Notes

- Ensure your repository's GitHub Pages settings are set to deploy from the `gh-pages` branch.
- If you encounter build errors, check for missing dependencies, required environment variables, or Node.js version mismatches.

---

Feel free to open issues or pull requests for improvements!
