# Migration Scripts - Environment Variables

## Required Environment Variables

All migration scripts now use environment variables for security instead of hard-coded credentials.

### For `sync-profiles.ts` and `make-admin.ts`

These scripts only need Replit Supabase credentials:

```bash
export VITE_SUPABASE_URL=https://exntlsasbkwadxsctjle.supabase.co
export VITE_SUPABASE_PUBLISHABLE_KEY=your_replit_publishable_key
```

### For `migrate-data.ts`

This script needs credentials for BOTH Supabase projects:

**Source (Lovable):**
```bash
export LOVABLE_SUPABASE_URL=https://pfkplkcmigbinqautyjx.supabase.co
export LOVABLE_SUPABASE_KEY=your_lovable_anon_key
```

**Destination (Replit):**
```bash
export VITE_SUPABASE_URL=https://exntlsasbkwadxsctjle.supabase.co
export VITE_SUPABASE_PUBLISHABLE_KEY=your_replit_publishable_key
```

---

## How to Run Scripts

### 1. Sync Profiles (after users signup)

```bash
# Make sure environment variables are set in Replit Secrets
bun run sync-profiles.ts
```

### 2. Make User Admin

```bash
bun run make-admin.ts
```

### 3. Migrate All Data (requires Lovable credentials)

```bash
# Set Lovable credentials first
export LOVABLE_SUPABASE_URL=https://pfkplkcmigbinqautyjx.supabase.co
export LOVABLE_SUPABASE_KEY=your_lovable_key

# Then run migration
bun run migrate-data.ts
```

---

## Security Notes

✅ **Good:** All credentials stored in environment variables  
✅ **Good:** Scripts exit with error if credentials missing  
✅ **Good:** No hard-coded secrets in repository  

❌ **Bad:** Hard-coding credentials in script files  
❌ **Bad:** Committing .env files with secrets  

---

## Current Setup (Replit)

Environment variables are already configured in Replit Secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These are automatically available to all scripts running in Replit.
