import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Replit Supabase - using environment variables for security
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('   Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface OldUserData {
  auth_users: Array<{
    id: string;
    email: string;
    created_at: string;
    raw_user_meta_data: {
      email: string;
      full_name?: string;
    };
  }>;
  profiles: Array<{
    id: string;
    username: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    handicap: number;
    membership: string;
    bio: string | null;
    role: string;
  }>;
  user_roles: Array<{
    id: string;
    user_id: string;
    role: string;
  }>;
}

async function syncProfiles() {
  console.log('🔄 Starting profile sync...\n');

  // Load old data from JSON
  let oldData: OldUserData;
  try {
    const jsonContent = readFileSync('attached_assets/auth-users-export-1762333761228_1762334350840.json', 'utf-8');
    oldData = JSON.parse(jsonContent);
    console.log(`📁 Loaded data for ${oldData.profiles.length} users from Lovable\n`);
  } catch (error) {
    console.error('❌ Error reading JSON file:', error);
    return;
  }

  // Create lookup maps
  const profilesByEmail = new Map(
    oldData.profiles.map(p => [p.email.toLowerCase(), p])
  );
  
  const adminEmails = new Set(
    oldData.user_roles
      .filter(ur => ur.role === 'admin')
      .map(ur => {
        const profile = oldData.profiles.find(p => p.id === ur.user_id);
        return profile?.email.toLowerCase();
      })
      .filter(Boolean)
  );

  console.log(`👑 Found ${adminEmails.size} admin users in old data\n`);

  // Get all current profiles from Replit Supabase
  const { data: currentProfiles, error: fetchError } = await supabase
    .from('profiles')
    .select('*');

  if (fetchError) {
    console.error('❌ Error fetching current profiles:', fetchError.message);
    return;
  }

  if (!currentProfiles || currentProfiles.length === 0) {
    console.log('⚠️  No profiles found in Replit Supabase yet.');
    console.log('   Users need to signup first!\n');
    console.log('📧 Expected emails to signup:');
    oldData.profiles.forEach(p => {
      const isAdmin = adminEmails.has(p.email.toLowerCase());
      console.log(`   ${isAdmin ? '👑' : '👤'} ${p.email} (${p.username})`);
    });
    return;
  }

  console.log(`📊 Found ${currentProfiles.length} profiles in Replit Supabase\n`);

  // Sync each profile
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const currentProfile of currentProfiles) {
    const email = currentProfile.email?.toLowerCase();
    if (!email) {
      console.log(`⏭️  Skipping profile ${currentProfile.id} (no email)`);
      skipped++;
      continue;
    }

    const oldProfile = profilesByEmail.get(email);
    if (!oldProfile) {
      console.log(`❓ User ${email} not found in old data (new user?)`);
      notFound++;
      continue;
    }

    const isAdmin = adminEmails.has(email);
    
    // Prepare updates
    const updates: any = {
      username: oldProfile.username,
      full_name: oldProfile.full_name,
      avatar_url: oldProfile.avatar_url,
      handicap: oldProfile.handicap,
      bio: oldProfile.bio,
      role: isAdmin ? 'admin' : 'user'
    };

    // Check if update needed
    const needsUpdate = 
      currentProfile.username !== updates.username ||
      currentProfile.full_name !== updates.full_name ||
      currentProfile.avatar_url !== updates.avatar_url ||
      currentProfile.handicap !== updates.handicap ||
      currentProfile.bio !== updates.bio ||
      currentProfile.role !== updates.role;

    if (!needsUpdate) {
      console.log(`✅ ${email} - Already synced`);
      skipped++;
      continue;
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentProfile.id);

    if (updateError) {
      console.error(`❌ Error updating ${email}:`, updateError.message);
      continue;
    }

    console.log(`✅ ${email} - Updated`);
    console.log(`   Username: ${updates.username}`);
    console.log(`   Role: ${updates.role} ${isAdmin ? '👑' : ''}`);
    if (updates.full_name) console.log(`   Name: ${updates.full_name}`);
    if (updates.handicap) console.log(`   Handicap: ${updates.handicap}`);
    updated++;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Sync Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped (already synced): ${skipped}`);
  console.log(`   ❓ Not found in old data: ${notFound}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (updated > 0) {
    console.log('🎉 Profile sync completed successfully!');
  }

  // Show remaining users that need to signup
  const signedUpEmails = new Set(currentProfiles.map(p => p.email?.toLowerCase()));
  const missingUsers = oldData.profiles.filter(
    p => !signedUpEmails.has(p.email.toLowerCase())
  );

  if (missingUsers.length > 0) {
    console.log('\n⏳ Still waiting for these users to signup:');
    missingUsers.forEach(p => {
      const isAdmin = adminEmails.has(p.email.toLowerCase());
      console.log(`   ${isAdmin ? '👑' : '👤'} ${p.email} (${p.username})`);
    });
  }
}

syncProfiles().catch(console.error);
