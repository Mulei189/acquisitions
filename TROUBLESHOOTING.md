# Docker & Neon Database Setup - Troubleshooting Guide

## Problem Summary

When running the development environment with Docker, the application couldn't connect to the Neon Cloud database, resulting in query failures:

```
Error: Failed query: select "id", "name", "email", "password", "role", "created_at", "updated_at" from "users" where "users"."email" = $1 limit $2
NeonDbError: (empty sourceError)
```

The health check worked (`GET /health` returned 200), but any database query would fail silently with a `NeonDbError` that provided no useful error details.

---

## Root Causes Identified

### Issue #1: Neon Local Service No Longer Exists
**File:** `docker-compose.dev.yml`

The original `docker-compose.dev.yml` included a `neon-local` service (a Docker-based Postgres proxy). However, when we switched to Option 2 (using Neon Cloud directly), we removed this service from the compose file but didn't update the database configuration.

**Result:** The app was trying to connect to a non-existent service.

---

### Issue #2: Incorrect Neon Configuration in Code
**File:** `src/config/database.js`

```javascript
if(process.env.NODE_ENV === 'development') {
    neonConfig.fetchEndpoint = 'http://neon-local:5432/sql';  // ← Points to deleted service!
    neonConfig.useSecureWebSocket = false;
    neonConfig.poolQueryViaFetch = true;
}
```

This development-mode configuration was overriding the real Neon Cloud endpoint, forcing the app to try connecting to `http://neon-local:5432/sql` (which no longer exists in the compose file).

**Result:** All database queries silently failed because the endpoint was unreachable.

---

### Issue #3: Channel Binding Parameter Incompatibility
**File:** `.env.development`

The connection string included:
```
?sslmode=require&channel_binding=require
```

The `&channel_binding=require` parameter is **not supported** by Neon's HTTP serverless client (`@neondatabase/serverless`). This caused silent failures with no error details.

**Result:** Queries would fail with empty `NeonDbError` objects.

---

## Step-by-Step Fix

### Step 1: Remove Neon Local Service from Docker Compose
**File:** `docker-compose.dev.yml`

**Before:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: acquisitions-db-dev
    ports:
      - "5432:5432"
    # ... rest of config
  
  app:
    # ... app config
```

**After:**
```yaml
services:
  app:
    # ... app config only, no postgres service
```

**Why:** Since we're using Neon Cloud directly, there's no need for a local database container. This also speeds up startup time.

---

### Step 2: Remove Neon Config Override
**File:** `src/config/database.js`

**Before:**
```javascript
import 'dotenv/config';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if(process.env.NODE_ENV === 'development') {
    neonConfig.fetchEndpoint = 'http://neon-local:5432/sql';
    neonConfig.useSecureWebSocket = false;
    neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);
export {db, sql};
```

**After:**
```javascript
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);
export {db, sql};
```

**Why:** Removing the development-mode override allows the app to use the real Neon Cloud endpoint from `DATABASE_URL`. The default configuration works perfectly with Neon Cloud.

---

### Step 3: Remove Unsupported Channel Binding Parameter
**File:** `.env.development`

**Before:**
```env
DATABASE_URL=postgresql://neondb_owner:npg_EIAsRHWM4tg2@ep-damp-night-agkcproo-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**After:**
```env
DATABASE_URL=postgresql://neondb_owner:npg_EIAsRHWM4tg2@ep-damp-night-agkcproo-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Why:** The `@neondatabase/serverless` HTTP driver doesn't support the `channel_binding` parameter. Removing it allows queries to execute successfully.

---

## Verification Steps

### 1. Verify Docker Compose Structure
```bash
npm run dev:docker:up
```

Should only start the `acquisitions-app-dev` container (no database container).

### 2. Check Logs
```bash
npm run dev:docker:logs
```

Should show:
```
Server is running on http://localhost:3000
```

No errors about `neon-local` or unreachable endpoints.

### 3. Test Database Connectivity
Try logging in with a valid user:
```
POST http://localhost:3000/api/auth/sign-in
Body: { "email": "mulei@123.com", "password": "your_password" }
```

Should return `200` with user data (or `401` if credentials are wrong), not `500` with a database error.

### 4. Test Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"OK","uptime":28.050943433,"timestamp":"2026-03-29T15:10:10.606Z"}
```

---

## Key Lessons

1. **When removing services from docker-compose, update all references to it** — The code still tried to connect to `neon-local` even after it was removed from the compose file.

2. **Configuration overrides can hide real issues** — The `neonConfig` override was silently failing instead of using the correct endpoint.

3. **Parameter compatibility matters** — `channel_binding` looked harmless but wasn't supported by the HTTP client, causing silent failures.

4. **Test with real data after changes** — The health check passed, but actual database queries failed. Always test the full workflow.

---

## Architecture After Fix

```
┌─────────────────────────────┐
│  Local Docker Container     │
│  (Node.js App)              │
│  Port: 3000                 │
└──────────────┬──────────────┘
               │ 
               │ DATABASE_URL
               │ (Neon Cloud via HTTPS)
               ▼
┌─────────────────────────────┐
│  Neon Cloud Database        │
│  (PostgreSQL Serverless)    │
│  Region: EU Central         │
│  Database: neondb           │
└─────────────────────────────┘
```

---

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| `docker-compose.dev.yml` | Removed `postgres` service | Using Neon Cloud instead |
| `src/config/database.js` | Removed `neonConfig` override | Let it use real Neon endpoint |
| `.env.development` | Removed `&channel_binding=require` | Not supported by HTTP driver |

---

## Related Documentation

- [Neon Connection Pools](https://neon.com/docs/guides/connection-pooling)
- [Neon HTTP Client](https://github.com/neondatabase/serverless)
- [Drizzle ORM Neon Integration](https://orm.drizzle.team/docs/get-started-postgresql#neon)

---

## Future Prevention

To avoid this issue in the future:

1. **Document configuration dependencies** — If removing a service, grep for all references in code
2. **Separate configs by environment** — Consider having `database.dev.js` and `database.prod.js` instead of conditional logic
3. **Test the full workflow** — Don't just test health checks; test actual database operations
4. **Version lock critical packages** — Ensure `@neondatabase/serverless` and `drizzle-orm` versions are compatible
