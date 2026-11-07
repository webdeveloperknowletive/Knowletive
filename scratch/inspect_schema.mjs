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

async function inspectTables() {
  const tables = ['profiles', 'job_roles', 'role_keywords', 'candidates', 'applications', 'resume_keyword_matches', 'leads', 'jobs', 'internships', 'testimonials', 'media_library'];

  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: Error ->`, error.message);
    } else {
      console.log(`Table ${t}: EXISTS. Sample keys:`, data[0] ? Object.keys(data[0]) : '(0 rows, schema exists)');
    }
  }
}

inspectTables();
