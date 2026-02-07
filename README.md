# CivicTrack Backend

A RESTful API backend for the CivicTrack civic engagement platform, built with Node.js, Express.js, and PostgreSQL.

## Features

- Multi-role user system (Citizen, Authority, Admin)
- Issue reporting with image uploads (AWS S3)
- JWT-based authentication with HTTP-only cookies
- Role-based access control
- Admin dashboard APIs

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL (Sequelize ORM)
- **Storage**: AWS S3
- **Auth**: JWT
- **Testing**: Jest + Supertest

## Quick Start

### Prerequisites

- Node.js v20+
- PostgreSQL database
- AWS account (for S3 image storage)

### Setup

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.sample .env

# Run database migrations
npm run migrate

# Seed database (development only)
npm run seed

# Start development server
npm run dev
```

Server runs on `http://localhost:4000` by default.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: 4000) |
| `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_HOST` | Yes | PostgreSQL connection |
| `JWT_SECRET`, `JWT_SALT` | Yes | JWT authentication |
| `FRONTEND_ORIGIN` | Yes | CORS allowed origins |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials |
| `AWS_S3_BUCKET`, `AWS_REGION` | Yes | S3 configuration |

See `.env.sample` for complete list with defaults.

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with hot reload |
| `npm test` | Run tests |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed database |
| `npm run reseed` | Drop, migrate, and seed |
| `npm run reset` | Drop all tables |
| `npm run db:migrate:status` | Check migration status |
| `npm run db:migrate:undo` | Rollback last migration |

## API Overview

Base URL: `http://localhost:4000/api`

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login |
| `/auth/logout` | POST | Logout |
| `/auth/me` | GET | Get current user |
| `/auth/change-password` | PATCH | Change password |

### Issues

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/issues/categories` | GET | List categories |
| `/issues/reports` | GET/POST | List or create reports |
| `/issues/reports/:id` | GET | Get report details |
| `/issues/reports/:id/status` | PATCH | Update status |
| `/issues/reports/:id/flag` | POST | Flag report |

### Admin Routes (`/admin/*`)

- **Users**: CRUD operations at `/admin/users`
- **Departments**: CRUD at `/admin/departments`
- **Authorities**: CRUD at `/admin/authorities`
- **Issue Categories**: CRUD at `/admin/issue-categories`

## Project Structure

```
src/
├── config/         # Database configuration
├── migrations/     # Database migrations
├── models/         # Sequelize models
├── modules/        # Feature modules (auth, issue, admin)
└── shared/         # Middleware and utilities
seeders/            # Database seeders
tests/              # Jest test files
```

## Docker

```bash
# Build
docker build -t civictrack-backend .

# Run
docker run -d --env-file .env -p 4000:4000 civictrack-backend
```

## Testing

```bash
npm test
```

Tests are located in the `tests/` directory and use Jest with Supertest for API testing.

## License

MIT
