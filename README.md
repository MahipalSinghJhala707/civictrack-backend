# CivicTrack Backend - Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [Database Setup](#database-setup)
8. [API Documentation](#api-documentation)
9. [Development Workflow](#development-workflow)
10. [Docker Setup](#docker-setup)
11. [CI/CD Pipeline](#cicd-pipeline)
12. [Deployment](#deployment)
13. [Testing](#testing)
14. [File Structure & File Descriptions](#file-structure--file-descriptions)
15. [Troubleshooting](#troubleshooting)

---

## Project Overview

**CivicTrack** is a civic engagement platform that allows citizens to report issues, authorities to manage and respond to reports, and administrators to oversee the entire system. The backend is built with Node.js, Express.js, and PostgreSQL, providing a RESTful API for the frontend application.

### Key Features

- **User Management**: Multi-role system (Citizen, Authority, Admin)
- **Issue Reporting**: Citizens can create reports with images
- **Issue Management**: Authorities can update issue status
- **Admin Dashboard**: Complete administrative control
- **File Upload**: AWS S3 integration for image storage
- **Authentication**: JWT-based authentication with HTTP-only cookies
- **Security**: Helmet.js for security headers, CORS protection

---

## Architecture

### Project Structure

```
civictrack-backend/
├── src/
│   ├── config/              # Configuration files
│   │   └── db.config.js      # Database configuration
│   ├── migrations/           # Database migration scripts
│   ├── models/               # Sequelize ORM models
│   ├── modules/              # Feature modules
│   │   ├── admin/            # Admin-only routes
│   │   │   ├── authority/    # Authority management
│   │   │   ├── authorityUser/ # Authority-user relationships
│   │   │   ├── department/   # Department management
│   │   │   ├── issueCategory/# Issue category management
│   │   │   └── user/         # User management
│   │   ├── auth/             # Authentication module
│   │   └── issue/            # Issue/report management
│   ├── seeders/              # Database seeding scripts
│   └── shared/               # Shared utilities
│       ├── middleware/       # Express middleware
│       └── utils/            # Utility functions
├── tests/                    # Test files
├── app.js                    # Express app configuration
├── server.js                 # Server entry point
├── Dockerfile                # Docker configuration
└── package.json              # Dependencies and scripts
```

### System Architecture

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ HTTP/REST API
       │
┌──────▼──────────────────┐
│   Express.js Backend     │
│  ┌────────────────────┐  │
│  │  Authentication    │  │
│  │  Authorization    │  │
│  │  Validation       │  │
│  └────────────────────┘  │
└──────┬───────────────────┘
       │
       ├──────────────┬──────────────┐
       │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
│  PostgreSQL │ │  AWS S3   │ │   AWS     │
│    (RDS)    │ │  (Images) │ │   EKS     │
└─────────────┘ └───────────┘ └───────────┘
```

---

## Tech Stack

### Core Technologies

- **Runtime**: Node.js 20
- **Framework**: Express.js 4.20.0
- **Database**: PostgreSQL (via Sequelize ORM 6.37.7)
- **Authentication**: JWT (jsonwebtoken 9.0.2, jose 5.10.0)
- **File Upload**: Multer 2.0.2
- **Cloud Storage**: AWS S3 (@aws-sdk/client-s3 3.933.0)
- **Security**: Helmet.js 8.1.0, CORS 2.8.5
- **Validation**: express-validator 7.3.0

### Development Tools

- **Testing**: Jest 30.2.0, Supertest 7.1.4
- **Development**: Nodemon 3.1.11
- **Linting**: ESLint 9.39.1

### Infrastructure

- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Cloud**: AWS (RDS, S3, EKS, ECR)

---

## Prerequisites

Before setting up the project, ensure you have:

1. **Node.js** (v20 or higher)
2. **npm** (comes with Node.js)
3. **PostgreSQL** database (local or AWS RDS)
4. **AWS Account** (for S3, RDS, EKS, ECR)
5. **Docker** (optional, for containerized deployment)
6. **Git** (for version control)

### AWS Services Required

- **Amazon RDS**: PostgreSQL database instance
- **Amazon S3**: For storing issue report images
- **Amazon ECR**: Container registry (for production)
- **Amazon EKS**: Kubernetes cluster (for production)

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd civictrack-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the `.env.sample` file to `.env`:

```bash
cp .env.sample .env
```

Edit `.env` with your configuration (see [Configuration](#configuration) section).

### 4. Database Setup

1. **Create PostgreSQL Database**:
   - If using AWS RDS, create a PostgreSQL instance
   - If using local PostgreSQL:
     ```bash
     createdb civictrack
     ```

2. **Run Migrations**:
   ```bash
   npm run migrate
   ```

3. **Seed Database** (optional, for development):
   ```bash
   npm run seed
   ```

### 5. Start the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 4000).

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=4000

# Database Configuration (AWS RDS)
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASS=your_database_password
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_SALT=your-jwt-salt
JWT_EXPIRES_IN=24h

# CORS Configuration
FRONTEND_ORIGIN=http://localhost:5173,https://yourdomain.com

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=us-east-1
AWS_S3_ACL=public-read
MAX_ISSUE_IMAGES=5

# Node Environment
NODE_ENV=production
```

### Environment Variable Descriptions

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port number |
| `DB_NAME` | Yes | PostgreSQL database name |
| `DB_USER` | Yes | PostgreSQL database user |
| `DB_PASS` | Yes | PostgreSQL database password |
| `DB_HOST` | Yes | Database host (RDS endpoint or localhost) |
| `DB_PORT` | No | Database port (default: 5432) |
| `JWT_SECRET` | Yes | Secret key for JWT tokens (min 32 chars) |
| `JWT_SALT` | Yes | Salt for password hashing |
| `JWT_EXPIRES_IN` | No | JWT expiration time (default: 24h) |
| `FRONTEND_ORIGIN` | Yes | Allowed CORS origins (comma-separated) |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key for S3 |
| `AWS_S3_BUCKET` | Yes | S3 bucket name for images |
| `AWS_REGION` | Yes | AWS region |
| `AWS_S3_ACL` | No | S3 ACL setting (default: public-read) |
| `MAX_ISSUE_IMAGES` | No | Maximum images per issue (default: 5) |
| `NODE_ENV` | No | Environment (development/production) |

---

## Database Setup

### Database Schema

The application uses the following main entities:

- **Users**: System users (citizens, authorities, admins)
- **Roles**: User roles (citizen, authority, admin)
- **Departments**: Government departments
- **Authorities**: Authority organizations
- **Issues**: Citizen-reported issues
- **Issue Images**: Images attached to issues
- **Flags**: Issue flags (inappropriate content, etc.)
- **Logs**: System activity logs

### Running Migrations

Migrations are used to manage database schema changes:

```bash
# Run all pending migrations
npm run migrate

# Run a specific migration
npm run migrate:add-rejected

# Reset database and run migrations
npm run migrate:reset
```

### Database Seeding

Seed scripts populate the database with initial data:

```bash
# Seed database with sample data
npm run seed

# Reset and reseed database
npm run reseed

# Reset database only
npm run reset
```

### Migration System

**Note**: This project uses a custom migration runner. Migrations are executed in alphabetical order and do not track which migrations have already been run. Always ensure migrations are idempotent.

**Migration Structure**:
- Migrations are located in `src/migrations/`
- Each migration exports `up()` and optionally `down()` functions
- Migrations use Sequelize's `queryInterface` for database operations

---

## API Documentation

### Base URL

```
http://localhost:4000/api
```

### Authentication

The API uses JWT-based authentication. After login, a token is stored in an HTTP-only cookie. Include this cookie in subsequent requests.

### API Endpoints

#### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |
| PATCH | `/api/auth/change-password` | Change user password | Yes |

**Register Request**:
```json
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Login Request**:
```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "citizen"  // optional
}
```

**Login Response**:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "citizen"
    }
  }
}
```

#### Issues (`/api/issues`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/issues/categories` | List issue categories | No | - |
| GET | `/api/issues/flags` | List available flags | No | - |
| POST | `/api/issues/reports` | Create new issue report | Yes | Citizen |
| GET | `/api/issues/reports` | List issue reports | Yes | All |
| GET | `/api/issues/reports/flagged` | List flagged reports | Yes | Admin |
| GET | `/api/issues/reports/:id` | Get report by ID | Yes | All |
| PATCH | `/api/issues/reports/:id/status` | Update report status | Yes | Authority/Admin |
| POST | `/api/issues/reports/:id/flag` | Flag a report | Yes | Citizen |
| PATCH | `/api/issues/reports/:id/visibility` | Toggle report visibility | Yes | Admin |

**Create Report Request**:
```json
POST /api/issues/reports
Content-Type: multipart/form-data

{
  "title": "Pothole on Main Street",
  "description": "Large pothole causing traffic issues",
  "categoryId": 1,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "images": [File, File]  // Up to 5 images
}
```

**Update Status Request**:
```json
PATCH /api/issues/reports/:id/status
Content-Type: application/json

{
  "status": "in_progress",
  "notes": "Work crew dispatched"
}
```

#### Admin Routes (`/api/admin`)

All admin routes require authentication and admin role.

**Users** (`/api/admin/users`):
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user by ID
- `POST /api/admin/users` - Create new user
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

**Departments** (`/api/admin/departments`):
- `GET /api/admin/departments` - List departments
- `POST /api/admin/departments` - Create department
- `PATCH /api/admin/departments/:id` - Update department
- `DELETE /api/admin/departments/:id` - Delete department

**Authorities** (`/api/admin/authorities`):
- `GET /api/admin/authorities` - List authorities
- `POST /api/admin/authorities` - Create authority
- `PATCH /api/admin/authorities/:id` - Update authority
- `DELETE /api/admin/authorities/:id` - Delete authority

**Issue Categories** (`/api/admin/issue-categories`):
- `GET /api/admin/issue-categories` - List categories
- `POST /api/admin/issue-categories` - Create category
- `PATCH /api/admin/issue-categories/:id` - Update category
- `DELETE /api/admin/issue-categories/:id` - Delete category

### Response Format

**Success Response**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]  // Validation errors
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Development Workflow

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run tests |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed database with sample data |
| `npm run reseed` | Reset and reseed database |
| `npm run reset` | Reset database (drop all tables) |
| `npm run fix-sequences` | Fix PostgreSQL sequences |

### Development Best Practices

1. **Environment Variables**: Never commit `.env` file. Use `.env.sample` as a template.

2. **Database Migrations**: 
   - Always create migrations for schema changes
   - Test migrations on development database first
   - Never modify existing migrations (create new ones instead)

3. **Code Style**:
   - Follow existing code patterns
   - Use ESLint for code quality
   - Write descriptive commit messages

4. **Testing**:
   - Write tests for new features
   - Run tests before committing
   - Maintain test coverage

### Testing the API

**Using cURL**:

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123"}'

# Get current user (with cookie)
curl -X GET http://localhost:4000/api/auth/me \
  -H "Cookie: token=your-jwt-token"
```

**Using Postman/Insomnia**:
- Import the API endpoints
- Set up environment variables
- Use cookie authentication

---

## Docker Setup

### Building the Docker Image

```bash
docker build -t civictrack-backend .
```

### Running the Container

```bash
docker run -d \
  --name civictrack-backend \
  --env-file .env \
  -p 4000:4000 \
  civictrack-backend
```

### Running Migrations in Container

```bash
docker exec civictrack-backend npm run migrate
docker exec civictrack-backend npm run seed
```

### Container Management

```bash
# View logs
docker logs civictrack-backend

# Stop container
docker stop civictrack-backend

# Remove container
docker rm civictrack-backend

# Restart container
docker restart civictrack-backend
```

### Dockerfile Details

The Dockerfile:
- Uses Node.js 20 Alpine (lightweight)
- Installs production dependencies only
- Sets `NODE_ENV=production`
- Exposes port dynamically (via PORT env var)
- Runs `node server.js` as entry point

---

## CI/CD Pipeline

### GitHub Actions Workflow

The project includes a CI/CD pipeline configured in `.github/workflows/backend-ci-cd.yml`.

### Pipeline Stages

#### 1. Build, Scan & Push

- **Checkout**: Clone repository
- **Configure AWS**: Set up AWS credentials
- **Login to ECR**: Authenticate with Amazon ECR
- **Build Docker Image**: Build application image
- **Tag Image**: Tag with commit SHA or custom tag
- **Push to ECR**: Push image to container registry
- **Scan with Trivy**: Security vulnerability scanning

#### 2. Deploy to EKS

- **Configure AWS**: Set up AWS credentials for deployment
- **Install/Update AWS CLI**: Ensure AWS CLI is available
- **Update kubeconfig**: Configure kubectl for EKS cluster
- **Install kubectl**: Install Kubernetes CLI
- **Deploy**: Update Kubernetes deployment with new image
- **Wait for Rollout**: Ensure deployment completes successfully
- **Run Migrations** (optional): Execute database migrations
- **Show Status**: Display pod and deployment status

### Required GitHub Secrets

Configure these secrets in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (e.g., us-east-1) |
| `ECR_URI` | ECR repository URI |
| `EKS_CLUSTER_NAME` | EKS cluster name |
| `RUN_DB_MIGRATIONS` | Set to 'true' to run migrations (optional) |

### IAM Permissions Required

The IAM user/role used by GitHub Actions needs:

**ECR Permissions**:
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`
- `ecr:PutImage`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`

**EKS Permissions**:
- `eks:DescribeCluster`
- `eks:ListClusters`

**Kubernetes Permissions**:
- `kubectl` access to the EKS cluster (configured via `aws eks update-kubeconfig`)

### Manual Deployment

You can manually trigger deployment via GitHub Actions:

1. Go to Actions tab in GitHub
2. Select "Backend CI/CD" workflow
3. Click "Run workflow"
4. Optionally specify an image tag
5. Click "Run workflow"

---

## Deployment

### AWS EKS Deployment

The application is designed to run on Amazon EKS (Elastic Kubernetes Service).

### Prerequisites

1. **EKS Cluster**: Create an EKS cluster in AWS
2. **ECR Repository**: Create a container registry
3. **RDS Instance**: PostgreSQL database instance
4. **S3 Bucket**: For storing issue images
5. **IAM Roles**: Proper IAM permissions configured

### Deployment Steps

1. **Build and Push Image** (automated via CI/CD):
   ```bash
   docker build -t civictrack-backend .
   docker tag civictrack-backend:latest <ECR_URI>:latest
   docker push <ECR_URI>:latest
   ```

2. **Update Kubernetes Deployment**:
   ```bash
   kubectl set image deployment/civictrack-backend \
     backend=<ECR_URI>:<tag> \
     -n civictrack
   ```

3. **Run Migrations** (if needed):
   ```bash
   kubectl create job --from=deployment/civictrack-backend \
     migrate-$(date +%s) \
     -n civictrack \
     -- npm run migrate
   ```

### Kubernetes Configuration

**Deployment Example**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: civictrack-backend
  namespace: civictrack
spec:
  replicas: 2
  selector:
    matchLabels:
      app: civictrack-backend
  template:
    metadata:
      labels:
        app: civictrack-backend
    spec:
      containers:
      - name: backend
        image: <ECR_URI>:latest
        ports:
        - containerPort: 4000
        envFrom:
        - secretRef:
            name: civictrack-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**Service Example**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: civictrack-backend
  namespace: civictrack
spec:
  selector:
    app: civictrack-backend
  ports:
  - port: 80
    targetPort: 4000
  type: LoadBalancer
```

### Environment Variables in Kubernetes

Store sensitive data in Kubernetes secrets:

```bash
kubectl create secret generic civictrack-secrets \
  --from-literal=DB_HOST=your-rds-endpoint \
  --from-literal=DB_USER=your-db-user \
  --from-literal=DB_PASS=your-db-password \
  --from-literal=JWT_SECRET=your-jwt-secret \
  -n civictrack
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

Tests are located in the `tests/` directory:
- `app.test.js` - Application-level tests
- `auth.test.js` - Authentication tests

### Writing Tests

Example test structure:

```javascript
const request = require('supertest');
const app = require('../app');

describe('Authentication', () => {
  test('POST /api/auth/login - should login user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

---

## File Structure & File Descriptions

This section provides a comprehensive overview of every file in the project and its purpose.

### Root Directory Files

| File | Purpose |
|------|---------|
| `package.json` | Node.js project configuration, dependencies, and npm scripts |
| `package-lock.json` | Locked dependency versions (auto-generated) |
| `server.js` | Application entry point - starts the Express server, validates environment, connects to database |
| `app.js` | Express application configuration - middleware setup, route registration, CORS configuration |
| `Dockerfile` | Docker image build instructions for containerization |
| `.dockerignore` | Files/directories to exclude from Docker builds |
| `.gitignore` | Files/directories to exclude from Git version control |
| `README.md` | This documentation file |
| `.env.sample` | Template for environment variables (copy to `.env`) |

### Source Directory (`src/`)

#### Configuration (`src/config/`)

| File | Purpose |
|------|---------|
| `db.config.js` | Sequelize database configuration - connection settings, SSL configuration for RDS |

#### Models (`src/models/`)

| File | Purpose |
|------|---------|
| `index.js` | Model loader - automatically loads all models and sets up associations |
| `user.model.js` | User model - stores citizen, authority, and admin user data |
| `role.model.js` | Role model - defines user roles (citizen, authority, admin) |
| `userRole.model.js` | User-Role junction table - many-to-many relationship between users and roles |
| `department.model.js` | Department model - government departments |
| `authority.model.js` | Authority model - authority organizations |
| `authorityUser.model.js` | Authority-User relationship - links users to authorities |
| `issue.model.js` | Issue/Report model - citizen-reported issues |
| `userIssue.model.js` | User-Issue relationship - links issues to users (reporters) |
| `issueImage.model.js` | Issue Image model - stores image metadata for issue reports |
| `authorityIssue.model.js` | Authority-Issue relationship - assigns issues to authorities |
| `flag.model.js` | Flag model - defines flag types (inappropriate, spam, etc.) |
| `userIssueFlag.model.js` | User-Issue-Flag relationship - tracks flagged issues |
| `log.model.js` | Log model - system activity logs |

#### Migrations (`src/migrations/`)

| File | Purpose |
|------|---------|
| `run-migrations.js` | Migration runner - executes all migration files in order |
| `README.md` | Migration documentation and guidelines |
| `001-add-rejected-status.js` | Adds 'rejected' status to user_issue.status enum |
| `20240101000001-create-roles.js` | Creates roles table |
| `20240101000002-create-users.js` | Creates users table |
| `20240101000003-create-departments.js` | Creates departments table |
| `20240101000004-create-authorities.js` | Creates authorities table |
| `20240101000005-create-issues.js` | Creates issues table |
| `20240101000006-create-flags.js` | Creates flags table |
| `20240101000007-create-user-role.js` | Creates user_role junction table |
| `20240101000008-create-authority-issue.js` | Creates authority_issue relationship table |
| `20240101000009-create-user-issue.js` | Creates user_issue relationship table |
| `20240101000010-create-issue-images.js` | Creates issue_images table |
| `20240101000011-create-logs.js` | Creates logs table |
| `20240101000012-create-authority-user.js` | Creates authority_user relationship table |
| `20240101000013-create-user-issue-flag.js` | Creates user_issue_flag relationship table |

#### Authentication Module (`src/modules/auth/`)

| File | Purpose |
|------|---------|
| `auth.route.js` | Authentication routes - register, login, logout, me, change-password |
| `auth.controller.js` | Authentication controller - handles auth request logic |
| `auth.service.js` | Authentication service - business logic for authentication |
| `auth.middleware.js` | Authentication middleware - verifies JWT tokens |
| `auth.roles.js` | Role-based access control - middleware for role checking |
| `auth.validator.js` | Authentication validators - input validation rules for auth endpoints |

#### Issue Module (`src/modules/issue/`)

| File | Purpose |
|------|---------|
| `issue.route.js` | Issue routes - create, list, get, update status, flag, toggle visibility |
| `issue.controller.js` | Issue controller - handles issue request logic |
| `issue.service.js` | Issue service - business logic for issue management |
| `issue.s3.service.js` | S3 service - handles image uploads to AWS S3 |
| `issue.middleware.js` | Issue middleware - file upload handling with Multer |
| `issue.validator.js` | Issue validators - input validation rules for issue endpoints |

#### Admin Module (`src/modules/admin/`)

**Admin Route** (`admin.route.js`):
- Main admin router - applies authentication and admin role check to all admin routes

**User Management** (`user/`):
| File | Purpose |
|------|---------|
| `user.route.js` | User CRUD routes |
| `user.controller.js` | User controller logic |
| `user.service.js` | User business logic |
| `user.validator.js` | User input validation |

**Department Management** (`department/`):
| File | Purpose |
|------|---------|
| `department.route.js` | Department CRUD routes |
| `department.controller.js` | Department controller logic |
| `department.service.js` | Department business logic |
| `department.validator.js` | Department input validation |

**Authority Management** (`authority/`):
| File | Purpose |
|------|---------|
| `authority.route.js` | Authority CRUD routes |
| `authority.controller.js` | Authority controller logic |
| `authority.service.js` | Authority business logic |
| `authority.validator.js` | Authority input validation |

**Authority User Management** (`authorityUser/`):
| File | Purpose |
|------|---------|
| `authorityUser.route.js` | Authority-user relationship routes |
| `authorityUser.controller.js` | Authority-user controller logic |
| `authorityUser.service.js` | Authority-user business logic |
| `authorityUser.validator.js` | Authority-user input validation |

**Issue Category Management** (`issueCategory/`):
| File | Purpose |
|------|---------|
| `issueCategory.route.js` | Issue category CRUD routes |
| `issueCategory.controller.js` | Issue category controller logic |
| `issueCategory.service.js` | Issue category business logic |
| `issueCategory.validator.js` | Issue category input validation |

#### Seeders (`src/seeders/`)

| File | Purpose |
|------|---------|
| `seed-all.js` | Main seeder - seeds all tables with sample data |
| `reset-db.js` | Database reset utility - drops all tables |
| `fix-sequences.js` | Sequence fixer - resets PostgreSQL auto-increment sequences |
| `utils/sequence-fixer.js` | Sequence fixer utility - helper functions for sequence management |

#### Shared Utilities (`src/shared/`)

**Middleware** (`shared/middleware/`):
| File | Purpose |
|------|---------|
| `error.middleware.js` | Global error handler - catches and formats all errors |
| `security.middleware.js` | Security headers - Helmet.js configuration |
| `validate.js` | Validation middleware - processes express-validator results |

**Utils** (`shared/utils/`):
| File | Purpose |
|------|---------|
| `httpError.js` | HTTP error utility - creates standardized error objects |

### Tests (`tests/`)

| File | Purpose |
|------|---------|
| `app.test.js` | Application-level tests - tests basic app functionality |
| `auth.test.js` | Authentication tests - tests login, register, etc. |

### CI/CD (`.github/workflows/`)

| File | Purpose |
|------|---------|
| `backend-ci-cd.yml` | GitHub Actions workflow - automated build, scan, and deployment to AWS EKS |

### Configuration Files

| File | Purpose |
|------|---------|
| `.dockerignore` | Excludes files from Docker builds (node_modules, .env, logs, etc.) |
| `.gitignore` | Excludes files from Git (node_modules, .env, logs, OS files, etc.) |

### File Naming Conventions

- **Models**: `*.model.js` - Sequelize ORM models
- **Routes**: `*.route.js` - Express route definitions
- **Controllers**: `*.controller.js` - Request handlers
- **Services**: `*.service.js` - Business logic layer
- **Validators**: `*.validator.js` - Input validation rules
- **Middleware**: `*.middleware.js` - Express middleware functions
- **Migrations**: `YYYYMMDDHHMMSS-description.js` or `NNN-description.js` - Database migrations
- **Tests**: `*.test.js` - Jest test files

### Module Pattern

Each feature module follows a consistent structure:

```
module-name/
├── module-name.route.js      # Routes
├── module-name.controller.js  # Controllers
├── module-name.service.js     # Services
└── module-name.validator.js  # Validators
```

This pattern ensures:
- **Separation of Concerns**: Each layer has a specific responsibility
- **Maintainability**: Easy to locate and modify code
- **Testability**: Each layer can be tested independently
- **Scalability**: Easy to add new features following the same pattern

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error**: `Database connection failed`

**Solutions**:
- Verify database credentials in `.env`
- Check if database is running
- Verify network connectivity to RDS
- Check security group rules (if using RDS)

#### 2. Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solutions**:
```bash
# Find process using the port
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or change PORT in .env
```

#### 3. Migration Errors

**Error**: `Migration failed`

**Solutions**:
- Check database connection
- Verify migration files are valid
- Ensure previous migrations completed
- Check database user permissions

#### 4. AWS S3 Upload Failed

**Error**: `S3 upload failed`

**Solutions**:
- Verify AWS credentials
- Check S3 bucket permissions
- Verify bucket exists and is accessible
- Check IAM policy for S3 access

#### 5. JWT Token Invalid

**Error**: `Unauthorized` or `Invalid token`

**Solutions**:
- Verify `JWT_SECRET` is set correctly
- Check token expiration
- Ensure cookies are being sent with requests
- Verify CORS configuration

#### 6. CI/CD Pipeline Failures

**Common Issues**:
- **AWS Credentials**: Verify secrets are set correctly
- **ECR Access**: Check IAM permissions for ECR
- **EKS Access**: Verify `eks:DescribeCluster` permission
- **kubectl**: Ensure kubectl can access the cluster

### Debugging

**Enable Debug Logging**:
```bash
DEBUG=* npm run dev
```

**Database Query Logging**:
Edit `src/config/db.config.js`:
```javascript
logging: console.log  // Enable SQL query logging
```

**Check Application Logs**:
```bash
# Docker
docker logs civictrack-backend

# Kubernetes
kubectl logs -f deployment/civictrack-backend -n civictrack
```

### Getting Help

1. Check application logs
2. Verify environment variables
3. Review error messages carefully
4. Check AWS service status
5. Review GitHub Actions logs for CI/CD issues

---

## Security Considerations

### Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secret**: Use a strong, random secret (minimum 32 characters)
3. **Database Passwords**: Use strong passwords
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Restrict CORS to known origins
6. **Helmet**: Security headers are enabled via Helmet.js
7. **Input Validation**: All inputs are validated using express-validator
8. **SQL Injection**: Sequelize ORM prevents SQL injection
9. **XSS Protection**: Helmet.js provides XSS protection

### Security Headers

The application uses Helmet.js to set security headers:
- Content Security Policy
- HTTP Strict Transport Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options

---

## Contributing

### Development Process

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Run tests and linting
5. Commit with descriptive messages
6. Push and create pull request

### Code Standards

- Follow existing code patterns
- Write clear, descriptive comments
- Maintain test coverage
- Update documentation as needed

---

## License

[Specify your license here]

---

## Support

For issues, questions, or contributions:
- Create an issue in the repository
- Contact the development team
- Review the troubleshooting section

---

**Last Updated**: [Current Date]
**Version**: 0.0.0
