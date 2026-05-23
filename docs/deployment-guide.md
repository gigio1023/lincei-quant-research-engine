# Deployment Guide

This document explains how to deploy the Auto Investment Helper using Docker and GitHub Actions.

## Requirements

- Docker and Docker Compose installed on the target host
- A GitHub Actions self-hosted runner (ARC) registered on that host
- Environment variables configured in an `.env` file

## Local Deployment

1. Copy `.env.example` to `.env` and adjust values for production.
2. Build and start containers:

   ```bash
   docker-compose build
   docker-compose up -d
   ```

The backend is available on port `3001`. The frontend is served on port `3000`.

## Database Migration Policy

Development defaults keep `TYPEORM_SYNCHRONIZE=true` so local SQLite databases can
bootstrap quickly. Do not use that mode for broker-connected or real-money
operation.

For production-like environments:

1. Set `TYPEORM_SYNCHRONIZE=false`.
2. Set `TYPEORM_MIGRATIONS_RUN=true`.
3. Before deployment, inspect pending migrations:

   ```bash
   cd backend
   npm run migration:show
   ```

4. Apply migrations before enabling automation:

   ```bash
   cd backend
   npm run migration:run
   ```

5. Check `GET /control-plane/status`. The `schemaMigrationPolicyReady` gate must
   be `ready` before treating paper-account lock and reservation evidence as
   production-deployable.

The current explicit migration adds the paper-account lock-version/event
evidence columns and reservation/order-plan indexes required by the paper
critical section for databases created by prior application releases. It does
not provide a full fresh-database baseline, broker write access, or live
trading.

## CI/CD Pipeline

The repository includes a workflow at `.github/workflows/deploy.yml`.
It runs on every push to the `main` branch and performs the following steps:

1. Checkout the repository.
2. Install backend and frontend dependencies using `npm ci`.
3. Build and start Docker containers with `docker-compose up -d --build`.

Make sure the self-hosted runner has permission to execute Docker commands.
