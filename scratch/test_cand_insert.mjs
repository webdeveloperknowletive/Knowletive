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

async function testInsertCandidate() {
  const testId = '99999999-9999-9999-9999-999999999999';
  const candidateData = {
    id: testId,
    full_name: 'Test Candidate',
    first_name: 'Test',
    last_name: 'Candidate',
    email: 'testcandidate@knowletive.com',
    phone: '9876543210',
    resume_file_url: 'https://knowletive.com/test.pdf',
    resume_file_name: 'test.pdf',
    resume_file_type: 'application/pdf',
    resume_file_size: 1024,
    skills: ['SQL', 'Excel'],
    resume_keywords: ['sql'],
    status: 'New',
    privacy_consent: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client.from('candidates').upsert(candidateData).select();
  console.log('Upsert base candidate:', { data: data ? data[0]?.id : null, error });

  if (data && data.length) {
    await client.from('candidates').delete().eq('id', testId);
    console.log('Cleaned up test candidate');
  }
}

testInsertCandidate();
