#!/bin/bash

# Build script for Capacitor: Creates static export without API routes
# API routes should be deployed separately and accessed via NEXT_PUBLIC_API_BASE_URL

set -e

echo "🔨 Building Next.js for Capacitor (static export)..."

# Backup API routes temporarily (move outside app directory)
if [ -d "app/api" ]; then
  echo "📦 Temporarily moving API routes..."
  mv app/api ./api.backup.tmp
fi

# Backup and replace config
echo "📝 Using Capacitor config..."
mv next.config.ts next.config.ts.backup
cp next.config.capacitor.ts next.config.ts

# Build with Capacitor config
echo "🏗️  Building static export..."
npx next build || {
  echo "❌ Build failed!"
  # Restore files on failure
  if [ -d "./api.backup.tmp" ]; then
    mv ./api.backup.tmp app/api
  fi
  if [ -f "next.config.ts.backup" ]; then
    mv next.config.ts.backup next.config.ts
  fi
  exit 1
}

# Restore API routes and config
if [ -d "./api.backup.tmp" ]; then
  echo "♻️  Restoring API routes..."
  mv ./api.backup.tmp app/api
fi

if [ -f "next.config.ts.backup" ]; then
  echo "♻️  Restoring original config..."
  mv next.config.ts.backup next.config.ts
fi

echo "✅ Build complete!"
echo ""
echo "📁 Static files are in: out/"
echo ""
echo "Next steps:"
echo "1. npx @capacitor/cli sync android"
echo "2. cd android && ./gradlew assembleDebug && cd .."
echo ""
