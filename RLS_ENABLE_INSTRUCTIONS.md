# 🔒 Enable Row Level Security (RLS) - CRITICAL SECURITY STEP

## ⚠️ IMPORTANT: YOUR DATA IS CURRENTLY EXPOSED!

Row Level Security (RLS) is currently **DISABLED** on all tables. This means anyone with your Supabase URL can read/write all data without authentication.

**You MUST enable RLS immediately to secure your data.**

---

## 📋 Step-by-Step Instructions

### 1. Open Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)

### 2. Run the RLS Enable SQL

Click **"New Query"** and paste the following SQL:

```sql
-- Re-enable RLS on all tables for security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_sub_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 'courses', 'sub_courses', 'course_configurations',
  'configuration_sub_courses', 'holes', 'tee_positions', 'rounds',
  'hole_scores', 'posts', 'likes', 'comments', 'course_reviews',
  'course_bookmarks', 'friendships'
)
ORDER BY tablename;
```

### 3. Click "Run" (or press Cmd/Ctrl + Enter)

You should see output like:

| tablename | rowsecurity |
|-----------|-------------|
| profiles  | true        |
| courses   | true        |
| sub_courses | true      |
| ...       | true        |

**All tables should show `rowsecurity = true`**

---

## ✅ Verification

After running the SQL, verify RLS is active:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected result**: All tables show `rowsecurity = true`

---

## 🔧 Troubleshooting

### Error: "permission denied"
- Make sure you're logged in as the project owner
- Use the SQL Editor in the Supabase Dashboard (not pgAdmin or other tools)

### Some tables still show `rowsecurity = false`
- Run the ALTER TABLE command for those specific tables again
- Check for typos in table names

---

## ⏰ Timeline

**CRITICAL: Enable RLS within 24 hours**

Without RLS:
- ❌ Anyone can read all user data
- ❌ Anyone can modify/delete courses
- ❌ Anyone can post/comment as other users
- ❌ Anyone can manipulate scores and rounds

With RLS enabled:
- ✅ Only authenticated users can access data
- ✅ Users can only modify their own data
- ✅ Course data is protected
- ✅ Admin-only operations are enforced

---

## 📝 Additional Notes

- RLS policies were already created during the initial migration
- This step only RE-ENABLES RLS after the bulk data import
- RLS was temporarily disabled to allow importing data without permission checks
- Once enabled, the app will work normally with full security

---

## ✅ Confirmation

After enabling RLS, confirm the app still works:
1. Visit your app
2. Login with your account
3. Try viewing courses
4. Try creating a post
5. Everything should work normally

If anything breaks, check the RLS policies in Supabase Dashboard → Authentication → Policies
