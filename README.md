# Web QA Tool

This project is a Next.js application with a modern UI, built using pnpm, Tailwind CSS, and Radix UI components. It is configured for static export and deployment to GitHub Pages.

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
