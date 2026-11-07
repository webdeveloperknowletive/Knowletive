import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['"]|['"]$/g, '');
    env[match[1]] = value;
  }
});

const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testRpc() {
  try {
    const { data, error } = await client.rpc('exec_sql', { sql: 'SELECT 1;' });
    console.log('rpc exec_sql:', { data, error });
  } catch (e) {
    console.log('rpc error:', e.message);
  }
}

testRpc();
