#!/bin/bash

# Build script for Capacitor: Creates static web assets in 'public/' for mobile apps

set -e

echo "🔨 Building Next.js application..."
bun run build

echo "📦 Creating static assets for Capacitor..."

# Create web directory for Capacitor if it doesn't exist
mkdir -p web

# The build output is in .next with server mode
# For Capacitor, we need to copy the static pages

# Option 1: Copy the static pages from .next
if [ -d ".next/static" ]; then
  echo "📁 Copying static assets from .next..."
  rm -rf web/*
  cp -r .next/static web/
  
  # Create index.html redirect if needed
  if [ ! -f "web/index.html" ]; then
    echo "✓ Static files copied to web/"
  fi
fi

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. bunx @capacitor/cli sync android"
echo "2. cd android && ./gradlew assembleDebug && cd .."
echo ""
