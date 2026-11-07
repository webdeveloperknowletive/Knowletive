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

async function testInsertLead() {
  const testId = '88888888-8888-8888-8888-888888888888';
  const leadData = {
    id: testId,
    first_name: 'Test',
    last_name: 'Lead',
    email: 'testlead@knowletive.com',
    phone: '9876543210',
    lead_type: 'Contact',
    message: 'Test message',
    source: 'Website Form',
    status: 'New',
    privacy_consent: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client.from('leads').upsert(leadData).select();
  console.log('Upsert base lead:', { data: data ? data[0]?.id : null, error });

  if (data && data.length) {
    await client.from('leads').delete().eq('id', testId);
    console.log('Cleaned up test lead');
  }
}

testInsertLead();
