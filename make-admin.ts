import { createClient } from '@supabase/supabase-js';

// Replit Supabase - using environment variables for security
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('   Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeAdmin() {
  console.log('🔍 Looking for user "kobdesign"...');
  
  // Find user with username kobdesign
  const { data: users, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', 'kobdesign');
  
  if (findError) {
    console.error('❌ Error finding user:', findError.message);
    return;
  }
  
  if (!users || users.length === 0) {
    console.error('❌ User "kobdesign" not found in profiles table');
    console.log('\n💡 Available users:');
    const { data: allUsers } = await supabase.from('profiles').select('username, email, role');
    console.table(allUsers);
    return;
  }
  
  const user = users[0];
  console.log('✅ Found user:', user.username);
  console.log('   Email:', user.email);
  console.log('   Current role:', user.role);
  console.log('   User ID:', user.id);
  
  if (user.role === 'admin') {
    console.log('\n✅ User is already an admin!');
    return;
  }
  
  // Update role to admin
  console.log('\n🔧 Updating role to admin...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id);
  
  if (updateError) {
    console.error('❌ Error updating role:', updateError.message);
    return;
  }
  
  console.log('✅ Successfully updated role to admin!');
  
  // Verify
  const { data: updated } = await supabase
    .from('profiles')
    .select('username, email, role')
    .eq('id', user.id)
    .single();
  
  console.log('\n📋 Updated profile:');
  console.table(updated);
}

makeAdmin().catch(console.error);
