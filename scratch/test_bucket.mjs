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

async function testCreateBucket() {
  console.log('Testing createBucket "media" with 50MB limit...');
  const { data, error } = await client.storage.createBucket('media', {
    public: true,
    fileSizeLimit: 52428800 // 50MB
  });
  console.log('createBucket result:', { data, error });

  const { data: buckets } = await client.storage.listBuckets();
  console.log('All buckets now:', buckets.map(b => ({ name: b.name, public: b.public })));
}

testCreateBucket();
