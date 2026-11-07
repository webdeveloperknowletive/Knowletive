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

async function testMediaUpload() {
  const testFile = 'test-image.txt';
  const buffer = Buffer.from('hello world media');
  const { data, error } = await client.storage.from('media').upload(testFile, buffer, {
    contentType: 'text/plain',
    upsert: true
  });
  console.log('Upload result:', { data, error });

  const { data: urlData } = client.storage.from('media').getPublicUrl(testFile);
  console.log('Public URL:', urlData.publicUrl);

  const res = await fetch(urlData.publicUrl);
  console.log('Public fetch status:', res.status, 'text:', await res.text());

  // Clean up
  await client.storage.from('media').remove([testFile]);
  console.log('Cleaned up');
}

testMediaUpload();
