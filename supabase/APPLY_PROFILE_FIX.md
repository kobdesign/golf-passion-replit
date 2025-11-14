# How to Apply Profile Fix Migration

## Problem
Users who signed up are missing profile records, causing errors when trying to:
- Like posts
- Create posts
- Comment
- Any action requiring user profile

**Error Message:** `Key is not present in table "profiles"`

## Solution
Apply the comprehensive migration that:
1. Fixes the `handle_new_user()` trigger function
2. Backfills missing profiles for existing users
3. Ensures RLS policies are correct

---

## Method 1: Via Supabase CLI (Recommended)

If you have Supabase CLI installed and configured:

```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push

# Or apply migrations one by one
supabase migration up
```

This method:
- ✅ Tracks migration history properly
- ✅ Prevents duplicate runs
- ✅ Handles transactions correctly

---

## Method 2: Via Supabase Dashboard (Manual)

⚠️ **Important:** Only use this if Method 1 is not available.

1. Go to **Supabase Dashboard** → Select your project
2. Navigate to **SQL Editor**
3. Open the migration file:
   ```
   supabase/migrations/20251114050000_complete_fix_for_profiles.sql
   ```
4. Copy and paste **Section by Section** (not all at once):
   
   **Step 1: Apply the function fix**
   ```sql
   -- Copy only the CREATE OR REPLACE FUNCTION section
   ```
   
   **Step 2: Run the backfill**
   ```sql
   -- Copy only the DO $$ backfill section
   ```
   
   **Step 3: Apply RLS policies**
   ```sql
   -- Copy the RLS section
   ```

5. Check the output after each step for success messages

**Expected Output:**
```
Backfill: X profiles inserted, 0 errors
=== Profile Fix Complete ===
Total auth users: X
Total profiles: X
Missing profiles (should be 0): 0
```

**⚠️ Warning:** Do not run the backfill section twice - it's safe but unnecessary.

---

## Verification Steps

After applying the migration:

1. **Check the logs** - Look for the success message
2. **Test signup** - Try creating a new account
3. **Test social features** - Try liking a post, creating a post, commenting
4. **Check browser console** - Should not see foreign key errors anymore

---

## Troubleshooting

### If you still see errors:

1. **Clear browser cache** and reload
2. **Check if migration was applied:**
   ```sql
   SELECT COUNT(*) FROM auth.users;
   SELECT COUNT(*) FROM public.profiles;
   -- These numbers should match
   ```

3. **Manually check a specific user:**
   ```sql
   SELECT u.id, u.email, p.id as profile_id, p.username
   FROM auth.users u
   LEFT JOIN public.profiles p ON u.id = p.id
   WHERE u.email = 'your@email.com';
   ```

### If you need to re-run the backfill:

```sql
-- This is safe to run multiple times (ON CONFLICT DO NOTHING)
INSERT INTO public.profiles (id, email, username, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

---

## What This Migration Does

### 1. Fixes `handle_new_user()` Function
- Properly extracts `full_name` from user metadata
- Uses email prefix as fallback (never NULL)
- Sets correct `search_path` to find tables
- Adds error handling

### 2. Backfills Missing Profiles
- Creates profile records for all existing users
- Safe to run multiple times (ON CONFLICT DO NOTHING)

### 3. Ensures RLS Policies
- Public can view all profiles
- Users can update their own profile
- Users can insert their own profile

---

## Support

If you encounter any issues:
1. Check the Supabase logs in the dashboard
2. Check browser console for detailed error messages
3. Verify RLS is enabled: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`
