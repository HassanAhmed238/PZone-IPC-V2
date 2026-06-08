const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) { val = val.substring(1, val.length - 1); }
    env[key] = val;
  }
});

const url = env['VITE_SUPABASE_URL'] + '/rest/v1/contract_module_access?select=*';
const key = env['VITE_SUPABASE_PUBLISHABLE_KEY'];

fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } })
  .then(res => res.text())
  .then(text => console.log('Response from phgudzzeylgoqxvbhjye:', text))
  .catch(err => console.error(err));
