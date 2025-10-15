# AI Prompt for Web QA Tool Enhancement

## Current Codebase Description

**Project Overview:**
A comprehensive Next.js-based Web Quality Assurance (QA) Tool that performs automated website testing and analysis. The application is built with TypeScript, Tailwind CSS, Radix UI components, and is configured for static export deployment to GitHub Pages.

**Current Core Features:**
1. **Multi-Device Screenshot Capture** - Takes screenshots across desktop (1920x1080), tablet (768x1024), and mobile (375x667) viewports using ScreenshotMachine API
2. **Accessibility Testing** - Uses aXe API to detect WCAG compliance issues including missing alt text, color contrast problems, keyboard navigation issues, and ARIA label violations
3. **Broken Link Detection** - Validates URLs, checks for protocol errors, spelling mistakes in domains, tests alternative URL versions (HTTP/HTTPS, www variants), and performs network connectivity tests
4. **SEO Analysis** - Basic SEO scoring and issue detection
5. **Image Optimization Checks** - Analyzes image-related performance issues
6. **Word Search & Counting** - Searches for specific keywords on pages and provides occurrence counts
7. **Performance Monitoring** - Tracks load times, First Contentful Paint, Largest Contentful Paint, and Cumulative Layout Shift metrics

**Technical Architecture:**
- **Frontend**: Next.js 15 with TypeScript, React hooks, and modern UI components
- **Styling**: Tailwind CSS with Radix UI component library
- **State Management**: React useState hooks for form handling and results display
- **API Integration**: Server actions for QA checks with external API calls
- **Deployment**: Static export optimized for GitHub Pages with automated deployment pipeline

**Current API Integrations:**
- ScreenshotMachine API for visual testing
- aXe Accessibility API for WCAG compliance checking
- Custom URL validation and network testing

## Enhancement Requirements

**Priority Enhancements Needed:**

### 1. **Performance Testing via API Integration**
- Replace mock performance data with real API-driven performance testing
- Integrate with services like Google PageSpeed Insights API, WebPageTest API, or GTmetrix API
- Capture real metrics: Core Web Vitals, loading times, resource optimization suggestions
- Provide actionable performance improvement recommendations

### 2. **Enhanced API Testing Framework**
- Implement comprehensive URL/API endpoint testing capabilities
- Add support for testing REST APIs, GraphQL endpoints, and web services
- Include response time monitoring, status code validation, and payload verification
- Support for authentication testing (API keys, OAuth, basic auth)

### 3. **Accessibility API Comparison & Selection**
- Research and integrate multiple accessibility testing APIs for comparison:
  - aXe API (current)
  - WAVE Web Accessibility Evaluation API
  - Accessibility Insights API
  - Tenon.io API
  - Pa11y API service
- Provide side-by-side comparison of results from different accessibility testing services
- Allow users to select preferred accessibility testing provider
- Combine results for comprehensive accessibility scoring

### 4. **Advanced Broken Link Verification**
- Implement deep link crawling to test all links found on a webpage
- Real-time URL status code verification (200, 301, 404, 500, etc.)
- Check for redirect chains and infinite loops
- Validate internal vs external links separately
- Test download links and file accessibility
- Monitor for temporary vs permanent link failures

### 5. **Enhanced Word Search with Visual Highlighting**
- Parse webpage content to search for specific keywords/phrases
- Generate highlighted screenshots showing exact locations of found words
- Overlay visual markers on screenshots indicating word positions
- Provide context snippets showing surrounding text
- Support for case-sensitive/insensitive search options
- Regular expression pattern matching for advanced search queries
- Color-coded highlighting based on search query priority

### 6. **Query String Integration**
- Accept search terms via URL query parameters
- Enable bookmarkable and shareable QA test configurations
- Support for predefined test suites via query strings
- Allow bulk testing with multiple search terms

### 7. **Advanced Reporting & Analytics**
- Generate comprehensive PDF/HTML reports
- Historical data tracking and trend analysis
- Comparative testing between different URLs
- Automated alerting for critical issues
- Integration with project management tools

**Technical Implementation Considerations:**
- Maintain static export compatibility for GitHub Pages deployment
- Implement proper error handling and fallbacks for API failures
- Add rate limiting and caching for external API calls
- Ensure responsive design across all device sizes
- Optimize for Core Web Vitals and performance best practices
- Implement proper TypeScript interfaces for all new API integrations

**User Experience Enhancements:**
- Progressive loading indicators for long-running tests
- Real-time progress updates during multi-step QA processes
- Customizable test configurations and saved presets
- Drag-and-drop interface for bulk URL testing
- Interactive results visualization with charts and graphs

**Security & Privacy Considerations:**
- Secure API key management for external services
- Rate limiting to prevent API abuse
- Privacy-compliant screenshot handling
- Secure handling of user-submitted URLs and sensitive data

This enhanced Web QA Tool should become a comprehensive, API-driven platform for complete website quality assurance, combining visual testing, performance monitoring, accessibility compliance, link validation, and content analysis in a single, user-friendly interface.