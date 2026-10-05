import { spawn } from 'node:child_process';

const env = { ...process.env, PORT: '4322', HOST: '127.0.0.1' };
const proc = spawn('node', ['dist/server/entry.mjs'], { env, stdio: 'inherit' });

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:4322/');
    console.log('Production Server Root Status:', res.status);
    const text = await res.text();
    console.log('Production Page Title Found:', text.includes('Knowletive'));
  } catch (err) {
    console.error('Production Server Error:', err.message);
  } finally {
    proc.kill();
    process.exit(0);
  }
}, 2500);
