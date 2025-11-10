import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('   Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ImportStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(h => h.trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row: any = {};

    headers.forEach((header, index) => {
      let value = values[index]?.trim() || null;

      if (value === '' || value === 'null') {
        value = null;
      } else if (value && (value.startsWith('{') || value.startsWith('['))) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if JSON parse fails
        }
      } else if (value && !isNaN(Number(value)) && value !== '') {
        // Convert numeric strings to numbers
        value = Number(value);
      }

      row[header] = value;
    });

    rows.push(row);
  }

  return rows;
}

async function importTable(
  tableName: string,
  csvPath: string,
  batchSize: number = 100
): Promise<ImportStats> {
  console.log(`\n📊 Importing ${tableName}...`);
  
  const stats: ImportStats = { total: 0, success: 0, failed: 0, skipped: 0 };

  try {
    const csvContent = readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    stats.total = rows.length;

    console.log(`   Found ${rows.length} rows in CSV`);

    if (rows.length === 0) {
      console.log('   ⏭️  No data to import');
      return stats;
    }

    // Import in batches
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select();

      if (error) {
        console.error(`   ❌ Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        stats.failed += batch.length;
        
        // Try inserting one by one to identify problematic rows
        console.log('   🔄 Trying individual inserts...');
        for (const row of batch) {
          const { error: rowError } = await supabase
            .from(tableName)
            .insert([row]);
          
          if (rowError) {
            console.error(`   ❌ Failed row:`, rowError.message);
            stats.failed++;
          } else {
            stats.success++;
          }
        }
      } else {
        stats.success += batch.length;
        console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} rows imported`);
      }
    }

    console.log(`\n   📈 Summary for ${tableName}:`);
    console.log(`      Total: ${stats.total}`);
    console.log(`      Success: ${stats.success}`);
    console.log(`      Failed: ${stats.failed}`);

  } catch (error: any) {
    console.error(`   ❌ Error reading CSV:`, error.message);
  }

  return stats;
}

async function importAllData() {
  console.log('🚀 Starting CSV data import...\n');

  const importOrder = [
    { table: 'courses', file: 'attached_assets/courses-export-2025-11-05_14-01-37_1762334805116.csv' },
    { table: 'sub_courses', file: 'attached_assets/sub_courses-export-2025-11-05_14-04-02_1762334805117.csv' },
    { table: 'configuration_sub_courses', file: 'attached_assets/configuration_sub_courses-export-2025-11-05_14-01-54_1762334805116.csv' },
    { table: 'holes', file: 'attached_assets/holes-export-2025-11-05_14-02-37_1762334805117.csv' },
    { table: 'tee_positions', file: 'attached_assets/tee_positions-export-2025-11-05_14-04-21_1762334805118.csv' },
  ];

  const allStats: Record<string, ImportStats> = {};

  for (const { table, file } of importOrder) {
    const stats = await importTable(table, file);
    allStats[table] = stats;
  }

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL IMPORT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  Object.entries(allStats).forEach(([table, stats]) => {
    const status = stats.failed > 0 ? '⚠️' : '✅';
    console.log(`${status} ${table.padEnd(30)} ${stats.success}/${stats.total} rows`);
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if all imports were successful
  const totalFailed = Object.values(allStats).reduce((sum, s) => sum + s.failed, 0);
  if (totalFailed === 0) {
    console.log('🎉 All data imported successfully!');
  } else {
    console.log(`⚠️  ${totalFailed} rows failed to import. Check errors above.`);
  }
}

importAllData().catch(console.error);
