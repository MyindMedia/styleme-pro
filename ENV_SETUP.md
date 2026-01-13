# FitCheck Environment Setup Guide

This document explains how to configure environment variables for local development.

---

## Quick Start

1. Create a `.env.local` file in the project root
2. Copy the template below and fill in your values
3. Restart the development server

---

## Environment Variables Template

```env
# ===========================================
# SUPABASE CONFIGURATION (Required for cloud sync)
# ===========================================
# Get these from your Supabase project dashboard:
# Project Settings → API

# Your Supabase project URL
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase anonymous/public key (safe to expose in client)
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here

# ===========================================
# OPTIONAL: Development Overrides
# ===========================================

# Override the Expo development port (default: 8081)
# EXPO_PORT=8081

# Override the API server port (default: 3000)
# API_PORT=3000
```

---

## Variable Reference

### Required Variables

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key | Supabase Dashboard → Project Settings → API |

### Auto-Configured Variables (Manus Platform)

These are automatically injected when running on the Manus platform. For local development without Manus, you may need to configure them manually:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `FORGE_API_KEY` | AI/LLM API key | Clothing recognition, outfit suggestions |
| `DATABASE_URL` | MySQL connection string | User data persistence |
| `S3_ENDPOINT` | S3-compatible storage endpoint | Image uploads |
| `S3_BUCKET` | Storage bucket name | Image uploads |
| `S3_ACCESS_KEY` | Storage access key | Image uploads |
| `S3_SECRET_KEY` | Storage secret key | Image uploads |

---

## Setting Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to initialize

2. **Get Your API Keys**
   - Navigate to Project Settings → API
   - Copy the "Project URL" → `EXPO_PUBLIC_SUPABASE_URL`
   - Copy the "anon public" key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. **Run Database Migrations**
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL to create tables

---

## Security Notes

| File | Should Commit? | Notes |
|------|----------------|-------|
| `.env.local` | **NO** | Contains secrets, gitignored |
| `.env.example` | Yes | Template only, no real values |
| `ENV_SETUP.md` | Yes | Documentation only |

**Important:**
- Never commit `.env.local` to version control
- The `EXPO_PUBLIC_` prefix makes variables available in client-side code
- Variables without this prefix are server-side only
- Rotate keys immediately if accidentally exposed

---

## Troubleshooting

### "Supabase URL not configured"

Ensure `EXPO_PUBLIC_SUPABASE_URL` is set in `.env.local` and restart the dev server:
```bash
pnpm dev
```

### "AI features not working"

The AI/LLM features require the `FORGE_API_KEY`. This is auto-configured on Manus platform. For local development, you'll need to obtain an API key.

### "Environment variables not loading"

1. Ensure the file is named `.env.local` (not `.env`)
2. Restart the development server after changes
3. Check for typos in variable names

---

## Related Documentation

- [info.md](./info.md) - Full app documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [server/README.md](./server/README.md) - Backend documentation
