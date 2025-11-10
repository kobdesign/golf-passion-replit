import { createClient } from '@supabase/supabase-js';

// Lovable Supabase (source) - using environment variables
const lovableUrl = process.env.LOVABLE_SUPABASE_URL;
const lovableKey = process.env.LOVABLE_SUPABASE_KEY;

// Replit Supabase (destination) - using environment variables
const replitUrl = process.env.VITE_SUPABASE_URL;
const replitKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate all required environment variables
if (!lovableUrl || !lovableKey) {
  console.error('❌ Missing Lovable Supabase credentials!');
  console.error('   Please ensure LOVABLE_SUPABASE_URL and LOVABLE_SUPABASE_KEY are set');
  console.error('   Example:');
  console.error('   export LOVABLE_SUPABASE_URL=https://pfkplkcmigbinqautyjx.supabase.co');
  console.error('   export LOVABLE_SUPABASE_KEY=your_lovable_key');
  process.exit(1);
}

if (!replitUrl || !replitKey) {
  console.error('❌ Missing Replit Supabase credentials!');
  console.error('   Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set');
  process.exit(1);
}

const lovableSupabase = createClient(lovableUrl, lovableKey);
const replitSupabase = createClient(replitUrl, replitKey);

// Table migration order (based on dependencies)
const TABLES = [
  'profiles',
  'courses',
  'holes',
  'rounds',
  'hole_scores',
  'posts',
  'likes',
  'comments',
  'course_reviews',
  'course_bookmarks',
  'friendships',
];

async function clearTable(tableName: string) {
  console.log(`🗑️  Clearing table: ${tableName}...`);
  const { error } = await replitSupabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error(`❌ Error clearing ${tableName}:`, error.message);
    return false;
  }
  console.log(`✅ Cleared ${tableName}`);
  return true;
}

async function exportTable(tableName: string) {
  console.log(`📤 Exporting ${tableName}...`);
  const { data, error } = await lovableSupabase.from(tableName).select('*');
  
  if (error) {
    console.error(`❌ Error exporting ${tableName}:`, error.message);
    return null;
  }
  
  console.log(`✅ Exported ${data?.length || 0} rows from ${tableName}`);
  return data;
}

async function importTable(tableName: string, data: any[]) {
  if (!data || data.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no data)`);
    return true;
  }

  console.log(`📥 Importing ${data.length} rows to ${tableName}...`);
  
  // Import in batches of 100 to avoid timeout
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await replitSupabase.from(tableName).insert(batch);
    
    if (error) {
      console.error(`❌ Error importing ${tableName} (batch ${i / batchSize + 1}):`, error.message);
      console.error('First row of failed batch:', JSON.stringify(batch[0], null, 2));
      return false;
    }
    
    console.log(`   Imported ${Math.min(i + batchSize, data.length)}/${data.length} rows`);
  }
  
  console.log(`✅ Imported ${data.length} rows to ${tableName}`);
  return true;
}

async function migrateData() {
  console.log('🚀 Starting data migration...\n');
  
  // Step 1: Clear existing data (in reverse order)
  console.log('📋 Phase 1: Clearing existing data...');
  for (const tableName of [...TABLES].reverse()) {
    const success = await clearTable(tableName);
    if (!success) {
      console.error(`\n❌ Migration failed at clearing ${tableName}`);
      return;
    }
  }
  console.log('\n✅ All tables cleared\n');
  
  // Step 2: Export and import data (in correct order)
  console.log('📋 Phase 2: Exporting and importing data...');
  const results: Record<string, number> = {};
  
  for (const tableName of TABLES) {
    const data = await exportTable(tableName);
    if (data === null) {
      console.error(`\n❌ Migration failed at exporting ${tableName}`);
      return;
    }
    
    const success = await importTable(tableName, data);
    if (!success) {
      console.error(`\n❌ Migration failed at importing ${tableName}`);
      return;
    }
    
    results[tableName] = data.length;
    console.log('');
  }
  
  // Summary
  console.log('🎉 Migration completed successfully!\n');
  console.log('📊 Migration Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Object.entries(results).forEach(([table, count]) => {
    console.log(`${table.padEnd(20)} ${count.toString().padStart(5)} rows`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run migration
migrateData().catch(console.error);
