FROM node:18-slim

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
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
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install Playwright browsers
RUN pnpm exec playwright install chromium
RUN pnpm exec playwright install-deps chromium

# Copy application code
COPY . .

# Build Next.js app
RUN pnpm run build

# Copy necessary files for standalone mode
RUN cp -r public .next/standalone/public || true
RUN cp -r .next/static .next/standalone/.next/static || true

# Copy and set permissions for start script
COPY start.sh .
RUN chmod +x start.sh

# Railway provides PORT env variable
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Expose the port (Railway will override with its own PORT)
EXPOSE 8080

# Start the application using the start script
CMD ["./start.sh"]
