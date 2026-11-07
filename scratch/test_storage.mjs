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

const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY);

async function testStorage() {
  const testFileName = `test-${Date.now()}.txt`;
  const buffer = Buffer.from('Test resume content');
  
  console.log('Testing upload to candidate-resumes...');
  const { data, error } = await client.storage.from('candidate-resumes').upload(testFileName, buffer, {
    contentType: 'text/plain',
    upsert: true
  });
  
  if (error) {
    console.error('Storage upload error:', error);
  } else {
    console.log('Storage upload SUCCESS:', data);
    
    // Test download
    const { data: dlData, error: dlErr } = await client.storage.from('candidate-resumes').download(testFileName);
    if (dlErr) {
      console.error('Storage download error:', dlErr);
    } else {
      console.log('Storage download SUCCESS, byteLength:', (await dlData.arrayBuffer()).byteLength);
    }
    
    // Clean up test file
    await client.storage.from('candidate-resumes').remove([testFileName]);
    console.log('Test file cleaned up');
  }
}

testStorage();
