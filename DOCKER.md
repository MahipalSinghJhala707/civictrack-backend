# Docker Setup Guide

This guide explains how to run the CivicTrack backend using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2 (included with Docker Desktop)

## Quick Start

### Production Mode

1. **Create `.env` file** (copy from `.env.sample`):
   ```bash
   cp .env.sample .env
   ```

2. **Update `.env` with your values**:
   ```env
   DB_USER=civictrack
   DB_PASS=your-secure-password
   DB_NAME=civictrack
   JWT_SECRET=your-jwt-secret-min-32-characters
   JWT_SALT=your-jwt-salt-min-32-characters
   FRONTEND_ORIGIN=http://localhost:5173
   ```

3. **Build and start containers**:
   ```bash
   docker-compose up -d
   ```

4. **View logs**:
   ```bash
   docker-compose logs -f app
   ```

5. **Stop containers**:
   ```bash
   docker-compose down
   ```

### Development Mode

1. **Start development environment**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **View logs**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f app
   ```

3. **Stop development containers**:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

## Available Commands

### Database Operations

**Run migrations:**
```bash
docker-compose exec app npm run migrate
```

**Seed database:**
```bash
docker-compose exec app npm run seed
```

**Reset and reseed:**
```bash
docker-compose exec app npm run reseed
```

**Access PostgreSQL CLI:**
```bash
docker-compose exec db psql -U civictrack -d civictrack
```

### Application Operations

**View application logs:**
```bash
docker-compose logs -f app
```

**View database logs:**
```bash
docker-compose logs -f db
```

**Restart application:**
```bash
docker-compose restart app
```

**Execute commands in container:**
```bash
docker-compose exec app sh
```

## Environment Variables

All environment variables are loaded from `.env` file. Key variables:

- `DB_USER` - PostgreSQL username (default: civictrack)
- `DB_PASS` - PostgreSQL password (default: civictrack123)
- `DB_NAME` - Database name (default: civictrack)
- `JWT_SECRET` - JWT secret key (min 32 characters, required)
- `JWT_SALT` - JWT salt for key derivation (required in production)
- `FRONTEND_ORIGIN` - Frontend origin for CORS
- `PORT` - Application port (default: 8080)

## Volumes

- `postgres_data` - PostgreSQL data persistence (production)
- `postgres_data_dev` - PostgreSQL data persistence (development)

## Network

Containers communicate via `civictrack-network` (production) or `civictrack-network-dev` (development).

## Troubleshooting

### Database connection issues

1. Check if database is healthy:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs db
   ```

3. Verify environment variables:
   ```bash
   docker-compose exec app env | grep DB_
   ```

### Application won't start

1. Check application logs:
   ```bash
   docker-compose logs app
   ```

2. Verify all required environment variables are set:
   ```bash
   docker-compose exec app env
   ```

3. Check if migrations ran successfully:
   ```bash
   docker-compose exec app npm run migrate
   ```

### Reset everything

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## Production Deployment

1. **Build production image:**
   ```bash
   docker build -t civictrack-backend:latest .
   ```

2. **Run with docker-compose:**
   ```bash
   docker-compose up -d
   ```

3. **Or run standalone:**
   ```bash
   docker run -d \
     --name civictrack-backend \
     -p 8080:8080 \
     --env-file .env \
     --network civictrack-network \
     civictrack-backend:latest
   ```

## Health Checks

The database service includes a health check that ensures PostgreSQL is ready before the application starts.

## Security Notes

- Never commit `.env` file to version control
- Use strong passwords in production
- Set `NODE_ENV=production` in production
- Ensure `JWT_SECRET` and `JWT_SALT` are at least 32 characters
- Use Docker secrets for sensitive data in production environments

