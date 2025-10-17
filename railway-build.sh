#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install

echo "Installing Playwright browsers..."
pnpm exec playwright install chromium
pnpm exec playwright install-deps chromium

echo "Building Next.js app..."
pnpm run build

echo "Build complete!"
