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

async function testInsertProfile() {
  const adminId = '00000000-0000-0000-0000-000000000001';
  const { data, error } = await client.from('profiles').upsert({
    id: adminId,
    email: env.DEFAULT_ADMIN_EMAIL || 'admin@knowletive.com',
    full_name: 'Knowletive Administrator',
    role: 'admin'
  }).select();
  console.log('Upsert profile result:', { data, error });
}

testInsertProfile();
