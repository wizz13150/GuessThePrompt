import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

function readEnvValue(key) {
  if (!existsSync('.env')) return '';
  const line = readFileSync('.env', 'utf8').split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
}

const appMode = readEnvValue('APP_MODE') || process.env.APP_MODE || 'civitai';
const apiKey = readEnvValue('CIVITAI_API_KEY') || process.env.CIVITAI_API_KEY || '';
const modelAir = readEnvValue('CIVITAI_MODEL_AIR') || process.env.CIVITAI_MODEL_AIR || '';

console.log('[INFO] Civitai Prompt Minigame doctor');
console.log(`[INFO] Node: ${process.version}`);
console.log(`[INFO] Platform: ${process.platform} ${process.arch}`);
console.log(`[INFO] Working directory: ${process.cwd()}`);
console.log(`[INFO] APP_MODE: ${appMode}`);
console.log(`[INFO] CIVITAI_API_KEY configured: ${apiKey.length >= 20 ? 'yes' : 'no'}`);
console.log(`[INFO] CIVITAI_MODEL_AIR: ${modelAir || '(default)'}`);
console.log('[OK] Local toolchain and configuration check completed. Live Civitai API errors will appear in the server console and logs/server.log.');
