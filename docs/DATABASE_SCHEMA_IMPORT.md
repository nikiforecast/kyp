# Journey Studio database schema import

This project’s schema is defined by ordered SQL migrations under `supabase/migrations/`. For a **single file** you can run in another environment, use:

- **`docs/kyp_database_schema.sql`** — all migrations concatenated in **lexicographic (timestamp) order** (~6k lines).

Regenerate it anytime after adding migrations:

```bash
( printf '%s\n' '-- Journey Studio consolidated (see docs/DATABASE_SCHEMA_IMPORT.md)'; \
  for f in $(ls supabase/migrations/*.sql | LC_ALL=C sort); do \
    echo ""; echo "-- $(basename "$f")"; cat "$f"; \
  done ) > docs/kyp_database_schema.sql
```

## Recommended: stay on Supabase

The app targets **Supabase** (PostgREST + `auth` schema + RLS). The usual workflow is:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

That applies migrations from `supabase/migrations/` without manual concatenation.

## Fresh Supabase project (no tables in Table Editor)

A new hosted project stays empty until **`db push`** (or equivalent) runs against **that** project. Creating the backend in GitHub doesn’t migrate the DB.

### 1. Get the correct **project reference**

Supabase Dashboard → **Project Settings** → **General** → **Reference ID**, or from the dashboard URL:

`/project/`**`YOUR_REF`**`/`

Use **this ref** — not `.env`, not an old teammate’s `.temp/` file stored in the repo (those easily point at the wrong project).

### 2. Link CLI to this project and push migrations

From the repo root:

```bash
npx supabase login
npx supabase link --project-ref YOUR_REF
```

`link` may ask for the **database password** (Dashboard → **Project Settings** → **Database** — use your saved password or “Reset database password” if unknown).

Then:

```bash
npx supabase db push
```

You should see many migration lines applied without errors.

### 3. Confirm

**Table Editor** → schema **`public`**. Tables like `workspaces`, `projects`, `user_journeys` should appear after a refresh.

### If CLI isn’t practical

Dashboard → **SQL Editor** → paste/run **`docs/kyp_database_schema.sql`** on an empty project only. Very large scripts can hit editor limits; **`db push`** is more reliable.

### If tables still look empty

- Open **Table Editor**, ensure you’re viewing schema **`public`**, not only **`auth`**.
- **`db push`** must complete without errors — copy any error output and fix ordering or collisions before retrying.

## Requirements (PostgreSQL)

| Requirement | Notes |
|-------------|--------|
| **PostgreSQL** | **13+** (uses `gen_random_uuid()` built-in; no extension required in modern Postgres). **15** is a safe choice. |
| **`auth` schema** | Many tables reference **`auth.users(id)`**. That table is created and owned by **Supabase Auth**, not by these migrations. |
| **Roles** | RLS policies use **`authenticated`**, **`anon`**, and sometimes **`service_role`**. Supabase defines these; vanilla Postgres does not. |
| **RLS** | Policies use **`auth.uid()`**, **`auth.jwt()`**, etc. — provided in Supabase. |

So: **importing into plain RDS/Neon/Cockroach without adapting FKs and auth will fail or won’t match the app.**

### If you use another Postgres host (not Supabase)

You have two realistic options:

1. **Keep Supabase for Auth + DB** (simplest): point `VITE_SUPABASE_URL` / keys at Supabase; only move other infra.

2. **Custom Postgres**: you must either:
   - Create a compatible **`auth`** schema and **`users`** table (and roles) matching what Supabase exposes, **or**
   - Replace every **`REFERENCES auth.users(id)`** with your own `public.app_users` (or similar) and rewrite RLS to use your session variables — this is a **large** fork of the schema and app.

Triggers in some migrations attach to **`auth.users`** (e.g. auto-add workspace members). Those only run on Supabase unless you recreate equivalent hooks.

## What the consolidated file contains

- **Tables, constraints, indexes** for Journey Studio (workspaces, projects, user journeys, law firms, examples, etc.).
- **Row Level Security** policies on most tables.
- **Functions / triggers** where migrations define them.
- **Data inserts** in a few migrations (e.g. seed rows, backfills). Replaying on a non-empty DB may conflict — prefer migrations on a **fresh** database.

## After import

1. **Create at least one user** in Supabase Auth (or your replacement), then align **`workspace_users`** and seed data as needed.
2. **Edge functions** (`supabase/functions/`) are **not** in the SQL file — deploy separately if you use them.
3. **Storage buckets** (if any) are not in migrations — configure in the provider UI.

## Security note

The consolidated SQL is **DDL for your own project**; treat it like source code. Do not commit **connection strings or keys**.
