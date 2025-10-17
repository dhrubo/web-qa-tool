#!/bin/sh
set -e

# Railway provides PORT, default to 8080 if not set
export PORT=${PORT:-8080}

echo "Starting Next.js server on port $PORT..."

# Start the Next.js standalone server
exec node .next/standalone/server.js
