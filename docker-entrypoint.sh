#!/bin/sh
set -e

echo "🚀 Starting CivicTrack Backend..."

echo "📦 Running database migrations..."
npm run migrate || {
  echo "⚠️  Migration failed, but continuing..."
}

echo "✅ Starting application..."
exec node server.js

