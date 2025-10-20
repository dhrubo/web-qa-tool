# Use Ubuntu as base to avoid slim image issues
FROM ubuntu:22.04

# Prevent tzdata apt-get prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    # Install Playwright deps
    apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    fonts-liberation \
    libglib2.0-0 \
    ca-certificates && \
    # Clean up
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies and Playwright
RUN pnpm install --frozen-lockfile && \
    pnpm exec playwright install chromium && \
    pnpm exec playwright install-deps chromium

# Copy application code
COPY . .

# Build Next.js app
RUN pnpm run build

# Set up for production
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the application
CMD ["sh", "-c", "node .next/standalone/server.js"]
