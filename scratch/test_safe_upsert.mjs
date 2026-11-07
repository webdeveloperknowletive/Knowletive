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

async function safeUpsert(table, record) {
  let payload = { ...record };
  let { data, error } = await client.from(table).upsert(payload).select().single();

  while (error) {
    console.log('Error encountered:', { message: error.message, code: error.code, details: error.details, hint: error.hint });
    const match = error.message.match(/column (?:[\w]+\.)?([\w]+) does not exist/i) ||
                  error.message.match(/Could not find the '([\w]+)' column/i) ||
                  (error.details && error.details.match(/column (?:[\w]+\.)?([\w]+) does not exist/i));
    if (match && match[1] && match[1] in payload) {
      console.log(`[safeUpsert] Column missing in ${table}: '${match[1]}', stripping and retrying...`);
      delete payload[match[1]];
      const retry = await client.from(table).upsert(payload).select().single();
      data = retry.data;
      error = retry.error;
    } else {
      break;
    }
  }

  if (error) throw error;
  return data;
}

async function test() {
  try {
    const testId = '77777777-7777-7777-7777-777777777777';
    const candidate = {
      id: testId,
      full_name: 'Resilient Candidate',
      first_name: 'Resilient',
      last_name: 'Candidate',
      email: 'resilient@knowletive.com',
      phone: '9876543210',
      resume_file_url: 'https://knowletive.com/res.pdf',
      resume_file_name: 'res.pdf',
      resume_file_type: 'application/pdf',
      resume_file_size: 2048,
      skills: ['Node.js'],
      resume_keywords: ['node'],
      status: 'New',
      privacy_consent: true,
      is_read: false,
      viewed_at: null,
      application_type: 'job',
      applied_role: 'Data Analyst',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const saved = await safeUpsert('candidates', candidate);
    console.log('Saved successfully in Supabase! ID:', saved.id, 'Email:', saved.email);

    await client.from('candidates').delete().eq('id', testId);
    console.log('Cleaned up test candidate');
  } catch (err) {
    console.error('Test caught error:', err);
  }
}

test();
