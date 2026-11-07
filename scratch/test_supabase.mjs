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

const url = env.SUPABASE_URL;
const anonKey = env.SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing with URL:', url);
console.log('Anon key exists:', !!anonKey, 'Service key exists:', !!serviceKey);

async function test() {
  const client = createClient(url, serviceKey || anonKey);
  
  const tables = ['profiles', 'job_roles', 'role_keywords', 'candidates', 'applications', 'resume_keyword_matches', 'leads', 'jobs', 'internships', 'testimonials', 'media_library', 'analytics_sessions', 'analytics_pageviews', 'analytics_sections', 'analytics_events'];
  
  for (const table of tables) {
    try {
      const { data, error } = await client.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table [${table}]: ERROR ->`, error.message, error.code, error.details);
      } else {
        console.log(`Table [${table}]: OK (count sample: ${data.length})`);
      }
    } catch (err) {
      console.log(`Table [${table}]: EXCEPTION ->`, err.message);
    }
  }

  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) {
      console.log('Storage buckets: ERROR ->', error.message);
    } else {
      console.log('Storage buckets:', buckets.map(b => b.name));
    }
  } catch (err) {
    console.log('Storage buckets: EXCEPTION ->', err.message);
  }
}

test();
