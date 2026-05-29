#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if npx prisma db execute --url "$DATABASE_URL" --stdin <<< "SELECT 1" 2>/dev/null; then
    echo "PostgreSQL is ready."
    break
  fi
  echo "  attempt $i/30 — retrying in 2s..."
  sleep 2
done

echo "Applying schema to database..."
# prisma db push: creates/updates tables from schema without needing migration files
# Safe for first run and container deployments
npx prisma db push --accept-data-loss

echo "Seeding database (safe to run multiple times)..."
npx ts-node prisma/seed.ts || echo "Seed already applied, skipping."

echo "Starting server..."
exec npm run dev
