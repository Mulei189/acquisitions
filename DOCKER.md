# Docker & Neon Database Setup Guide

This guide explains how to run the Acquisitions API using Docker with Neon Database in both development and production environments.

## Architecture Overview

```
Development (Local):
├─ Docker Container (Node.js App)
│  └─ PORT: 3000
└─ Docker Container (Neon Local - Postgres Proxy)
   └─ PORT: 5432

Production:
├─ Docker Container (Node.js App) 
│  └─ PORT: 3000
└─ Neon Cloud Database (External)
   └─ Managed by Neon.tech
```

---

## Prerequisites

- **Docker** (v20.0+) and **Docker Compose** (v2.0+) installed
- **Node.js** v20+ (for local development without Docker)
- A **Neon Cloud account** (for production): https://console.neon.tech
- **Arcjet account** for security rules: https://app.arcjet.com

---

## Development Setup (Local with Neon Local)

### What is Neon Local?

Neon Local is a Docker-based Postgres proxy that emulates the Neon Cloud environment locally. It:
- Runs Postgres in a lightweight Docker container
- Creates ephemeral branches for testing (similar to Neon Cloud features)
- Requires zero configuration—just works out of the box
- Persists data across restarts

**Learn more:** https://neon.com/docs/local/neon-local

### Step 1: Configure Development Environment

```bash
# Copy the development environment template
cp .env.development .env

# Update any development-specific settings if needed
# DATABASE_URL is automatically set to connect to Neon Local via Docker Compose
```

The `.env.development` file includes:
- `DATABASE_URL=postgres://postgres:postgres@neon-local:5432/neon` (Neon Local)
- `NODE_ENV=development`
- `LOG_LEVEL=debug`

### Step 2: Start the Development Stack

```bash
# Start both Neon Local and the application
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d --build
```

**What happens:**
1. Neon Local container starts and initializes a Postgres instance
2. Application container starts and waits for Neon Local to be healthy
3. The app is available at `http://localhost:3000`
4. Database is available at `localhost:5432` (for debugging with pgAdmin, etc.)

### Step 3: Run Database Migrations

In another terminal:

```bash
# Execute migrations inside the app container
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Or generate new migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:generate
```

### Step 4: Access Your Application

```bash
# Health check
curl http://localhost:3000/health

# API endpoint
curl http://localhost:3000/api

# Auth endpoint
curl http://localhost:3000/api/auth
```

### Step 5: Stop the Development Stack

```bash
# Stop and remove containers
docker-compose -f docker-compose.dev.yml down

# Stop and remove containers + volumes (⚠️ deletes database data)
docker-compose -f docker-compose.dev.yml down -v
```

### Development Tips

**Hot Reload:**
- The `docker-compose.dev.yml` mounts your source code as a volume
- Change code locally, and the app automatically reloads (Node's `--watch` flag)

**Debug Database:**
- Use pgAdmin or psql to connect to `localhost:5432`
- Credentials: `postgres/postgres`
- Database name: `neon`

**View Logs:**
```bash
# View all logs
docker-compose -f docker-compose.dev.yml logs -f

# View only app logs
docker-compose -f docker-compose.dev.yml logs -f app

# View only Neon Local logs
docker-compose -f docker-compose.dev.yml logs -f neon-local
```

---

## Production Setup (Neon Cloud)

### Step 1: Create a Neon Cloud Database

1. Go to https://console.neon.tech
2. Create a new project
3. Copy your **Connection String** (format: `postgres://user:password@host/dbname?sslmode=require`)

### Step 2: Configure Production Environment

```bash
# Create production environment file
cp .env.production.example .env.production

# Edit and add your actual Neon Cloud connection string and secrets
nano .env.production
```

Update the following in `.env.production`:
```env
DATABASE_URL=postgres://user:password@your-neon-host.neon.tech/dbname?sslmode=require
ARCJET_KEY=your_production_key
JWT_SECRET=your_production_secret
NODE_ENV=production
LOG_LEVEL=info
```

**⚠️ IMPORTANT SECURITY NOTES:**
- **Never commit** `.env.production` to version control
- Use secrets managers: GitHub Secrets, AWS Secrets Manager, HashiCorp Vault, etc.
- Inject secrets via CI/CD pipelines during deployment

### Step 3: Build the Production Image

```bash
# Build Docker image for production
docker build -t acquisitions-app:latest .

# Or use docker-compose
docker-compose -f docker-compose.prod.yml build
```

### Step 4: Run Migrations (One-time)

Before starting the app, run migrations against your Neon Cloud database:

```bash
# Set environment and run migrations
docker run --env-file .env.production acquisitions-app:latest npm run db:migrate
```

### Step 5: Start the Production Stack

```bash
# Start the application
docker-compose -f docker-compose.prod.yml up -d

# Or pull from your registry and start
docker run -d \
  --name acquisitions-app \
  -p 3000:3000 \
  --env-file .env.production \
  acquisitions-app:latest
```

### Step 6: Verify Production Deployment

```bash
# Check health endpoint
curl https://your-domain.com/health

# Check logs
docker logs acquisitions-app
```

### Production Deployment Checklist

- [ ] Database URL points to Neon Cloud (not Neon Local)
- [ ] All secrets are injected via secure means (not hardcoded)
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info` (not debug)
- [ ] Migrations have been run
- [ ] Health check passes
- [ ] SSL/TLS is enabled (if using reverse proxy)
- [ ] Docker image is tagged with a version, not just `latest`

---

## Docker Commands Reference

### Development Commands

```bash
# Start development stack with Neon Local
docker-compose -f docker-compose.dev.yml up -d

# Stop development stack
docker-compose -f docker-compose.dev.yml down

# Remove development stack and volumes
docker-compose -f docker-compose.dev.yml down -v

# Run migrations in dev
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Access container shell
docker-compose -f docker-compose.dev.yml exec app sh
```

### Production Commands

```bash
# Build production image
docker build -t acquisitions-app:v1.0 .

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Stop production stack
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Run migrations
docker run --env-file .env.production acquisitions-app:v1.0 npm run db:migrate
```

---

## Environment Variables

### Development (`docker-compose.dev.yml` uses `.env.development`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `development` | Enables debug logging, hot reload |
| `PORT` | `3000` | Application port |
| `LOG_LEVEL` | `debug` | Verbose logging |
| `DATABASE_URL` | `postgres://postgres:postgres@neon-local:5432/neon` | Neon Local connection |
| `ARCJET_KEY` | Development key | Security rules |

### Production (`docker-compose.prod.yml` uses injected env vars)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `3000` | Application port |
| `LOG_LEVEL` | `info` | Minimal logging |
| `DATABASE_URL` | `postgres://...neon.tech...` | Neon Cloud connection |
| `ARCJET_KEY` | Production key | Security rules |
| `TRUST_PROXY` | `true` | Trust reverse proxy headers |

---

## Troubleshooting

### ❌ "Cannot connect to database"

**Development:**
- Ensure Neon Local container is running: `docker ps | grep neon-local`
- Health check it: `docker-compose -f docker-compose.dev.yml logs neon-local`
- Container may still be initializing—wait 30 seconds

**Production:**
- Verify `DATABASE_URL` is correct
- Ensure Neon Cloud connection string includes `sslmode=require`
- Check firewall/network access to Neon Cloud

### ❌ "Port 3000 already in use"

```bash
# Find process using port 3000
lsof -i :3000

# Or change port in docker-compose file:
# ports:
#   - "3001:3000"
```

### ❌ "database does not exist"

**Development:**
- Neon Local creates a `neon` database by default
- If using custom database, create it first

**Production:**
- Verify database name in your Neon Cloud connection string

### ❌ "Migrations not running"

```bash
# Run migrations manually
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Check migration status
docker-compose -f docker-compose.dev.yml exec app npm run db:generate
```

---

## CI/CD Integration (Example)

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: docker build -t acquisitions-app:${{ github.sha }} .
      
      - name: Run Migrations
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          ARCJET_KEY: ${{ secrets.PROD_ARCJET_KEY }}
        run: |
          docker run \
            -e DATABASE_URL=$DATABASE_URL \
            -e ARCJET_KEY=$ARCJET_KEY \
            acquisitions-app:${{ github.sha }} \
            npm run db:migrate
      
      - name: Push to Registry
        run: |
          docker tag acquisitions-app:${{ github.sha }} \
                     your-registry/acquisitions-app:latest
          docker push your-registry/acquisitions-app:latest
```

---

## Resources

- **Neon Documentation**: https://neon.com/docs
- **Neon Local**: https://neon.com/docs/local/neon-local
- **Neon Cloud Quickstart**: https://neon.com/docs/get-started
- **Docker Documentation**: https://docs.docker.com
- **Docker Compose**: https://docs.docker.com/compose
- **Arcjet**: https://arcjet.com/docs

---

## Next Steps

1. ✅ Start development with `docker-compose -f docker-compose.dev.yml up`
2. ✅ Test the application at `http://localhost:3000`
3. ✅ Create a Neon Cloud project for production
4. ✅ Configure production environment variables
5. ✅ Deploy using your preferred hosting platform

---

**Questions?** Check the troubleshooting section or refer to the official Neon and Docker documentation.
