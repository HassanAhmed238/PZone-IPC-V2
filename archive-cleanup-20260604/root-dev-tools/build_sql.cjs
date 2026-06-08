const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase/migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let finalSql = '';
for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  finalSql += `\n-- Migration: ${file}\n`;
  finalSql += content;
  finalSql += '\n';
}

fs.writeFileSync(path.join(__dirname, 'all_migrations_dump.sql'), finalSql);
console.log('Successfully created all_migrations_dump.sql with ' + files.length + ' files.');
