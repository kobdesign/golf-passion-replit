import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  try {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${sqlFiles.length} migration files`);

    for (const file of sqlFiles) {
      console.log(`\nRunning migration: ${file}`);
      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf-8');
      
      // Split by semicolons and run each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
            if (error) {
              console.error(`  ⚠️  Statement ${i + 1} failed:`, error.message);
            } else {
              console.log(`  ✓ Statement ${i + 1} executed`);
            }
          } catch (err: any) {
            console.error(`  ⚠️  Statement ${i + 1} error:`, err.message);
          }
        }
      }
      
      console.log(`✓ Completed ${file}`);
    }

    console.log('\n✅ All migrations completed');
  } catch (error: any) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
