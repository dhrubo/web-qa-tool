#!/bin/sh
set -e

# Railway provides PORT, default to 8080 if not set
export PORT=${PORT:-8080}

# Set memory limits for Node.js (2GB recommended for parallel screenshots)
export NODE_OPTIONS="--max-old-space-size=2048"

# Ensure correct ownership and permissions
chown -R 1000:1000 .next 2>/dev/null || true

# Copy standalone files (if not already done by Dockerfile)
cp -r .next/standalone/* . 2>/dev/null || true
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true

echo "Starting Next.js server on port $PORT with memory limit 2GB..."

# Start the Next.js standalone server
exec node .next/standalone/server.js
