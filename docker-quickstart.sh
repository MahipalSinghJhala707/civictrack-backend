#!/bin/bash

echo "🐳 CivicTrack Docker Quick Start"
echo ""

if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.sample..."
    cp .env.sample .env
    echo "✅ Please update .env with your values before continuing"
    echo ""
    read -p "Press enter to continue after updating .env..."
fi

echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

echo ""
echo "📊 Running migrations..."
docker-compose exec app npm run migrate

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: docker-compose logs -f app"
echo "  - Stop: docker-compose down"
echo "  - Seed DB: docker-compose exec app npm run seed"
echo ""

