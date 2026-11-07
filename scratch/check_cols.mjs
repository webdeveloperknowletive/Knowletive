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

async function checkCols() {
  const { data: cand, error: cErr } = await client.from('candidates').select('is_read, viewed_at, application_type, preferred_role').limit(1);
  console.log('Candidates is_read/viewed_at/application_type check:', cErr ? cErr.message : 'OK');

  const { data: lead, error: lErr } = await client.from('leads').select('is_read, viewed_at').limit(1);
  console.log('Leads is_read/viewed_at check:', lErr ? lErr.message : 'OK');

  const { data: prof, error: pErr } = await client.from('profiles').select('password_hash').limit(1);
  console.log('Profiles password_hash check:', pErr ? pErr.message : 'OK');

  const { data: test, error: tErr } = await client.from('testimonials').select('thumbnail_url').limit(1);
  console.log('Testimonials thumbnail_url check:', tErr ? tErr.message : 'OK');

  const { data: med, error: mErr } = await client.from('media_library').select('category, is_published, display_order').limit(1);
  console.log('Media library extra columns check:', mErr ? mErr.message : 'OK');
}

checkCols();
