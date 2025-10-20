# Use Node 20 Alpine as base
FROM node:20-alpine

# Install required system dependencies
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    harfbuzz \
    nss \
    freetype \
    ttf-freefont \
    font-noto-emoji

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Set Chrome executable path for Playwright
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Skip Playwright browser install since we're using system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy app source
COPY . .

# Build the app
RUN pnpm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Create a non-root user
RUN addgroup -S appuser && adduser -S -G appuser appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 8080

# Start the app
CMD ["node", ".next/standalone/server.js"]
