# Destructive Script Usage

Date: 2026-08-05
Project: FWL CRM

## Covered scripts
- `clear_db.js`
- `scripts/clear-demo.js`
- `scripts/init-db.js`

## Required guards
These scripts now require:
- `ALLOW_DESTRUCTIVE_DB_SCRIPTS=true`

And if running in a production-like environment, also:
- `CONFIRM_PRODUCTION_DESTRUCTIVE=I_UNDERSTAND`

If `DATABASE_URL` looks production-like, also require:
- `CONFIRM_DB_TARGET=YES`

## Why this exists
These scripts can delete live CRM data or recreate core tables. They must never be run casually.

## Safe usage pattern
1. Confirm you are not pointing at production unless explicitly intended
2. Confirm a fresh DB backup exists
3. Export critical tables if needed
4. Set the required guard env vars explicitly
5. Run the script once
6. Verify result immediately

## Never do this
- never run `init-db.js` against production without a deliberate wipe plan
- never run destructive scripts from muscle memory in a shell with a persisted `DATABASE_URL`
- never assume a script is safe because it says "demo"

## Minimum pre-run checklist
- backup exists
- target DB confirmed
- environment confirmed
- guard env vars set intentionally
- operator understands impact
