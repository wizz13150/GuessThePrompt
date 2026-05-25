import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const port = 15000 + Math.floor(Math.random() * 20000);
const baseUrl = `http://localhost:${port}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer(url, timeoutMs = 10000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Server did not become ready: ${lastError?.message ?? 'timeout'}`);
}

async function jsonFetch(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} failed: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function runApiSmokeTest() {
  assert(existsSync('dist-server/index.js'), 'dist-server/index.js is missing. Run npm run build first.');
  assert(existsSync('dist/index.html'), 'dist/index.html is missing. Run npm run build first.');

  const child = spawn(process.execPath, ['dist-server/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), APP_MODE: 'mock' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  try {
    await waitForServer(`${baseUrl}/api/health`);
    const indexResponse = await fetch(`${baseUrl}/`);
    const indexHtml = await indexResponse.text();
    assert(indexResponse.ok && indexHtml.includes('<div id="root"></div>'), 'Index page was not served by the production server.');
    const tabResponse = await fetch(`${baseUrl}/leaderboard`);
    assert(tabResponse.ok, 'Routed tab fallback did not return the React app.');
    const health = await jsonFetch('/api/health');
    assert(health.status === 'ok', 'Health endpoint did not return ok.');
    assert(health.promptCache?.total > 0, 'Prompt cache stats are missing.');

    const cache = await jsonFetch('/api/prompts/cache-preview');
    assert(Array.isArray(cache.prompts) && cache.prompts.length > 0, 'Cache preview returned no prompts.');

    const me = await jsonFetch('/api/me');
    assert(me.authenticated === true, 'Mock user is not authenticated.');

    const settingsPayload = await jsonFetch('/api/generation/settings');
    assert(settingsPayload.settings?.batch >= 1, 'Generation settings endpoint did not return a batch value.');
    const updatedSettingsPayload = await jsonFetch('/api/generation/settings', {
      method: 'POST',
      body: JSON.stringify({ ...settingsPayload.settings, batch: 4, steps: 30 })
    });
    assert(updatedSettingsPayload.settings.batch === 4, 'Generation settings did not preserve batch=4.');

    const roundPayload = await jsonFetch('/api/game/new-round', {
      method: 'POST',
      body: JSON.stringify({ mode: 'adventure', difficulty: 'normal' })
    });
    assert(roundPayload.round?.id, 'New round did not return a round id.');
    assert(!roundPayload.round.answer, 'Hidden answer leaked before solving.');

    const estimatePayload = await jsonFetch(`/api/game/${roundPayload.round.id}/estimate`, { method: 'POST' });
    assert(estimatePayload.estimate?.buzzCost > 0, 'Estimate did not return a Buzz cost.');
    assert(estimatePayload.estimate?.batch === 4, 'Estimate did not reflect configured batch=4.');

    const generatedPayload = await jsonFetch(`/api/game/${roundPayload.round.id}/generate`, { method: 'POST' });
    assert(generatedPayload.round?.imageUrl, 'Generate did not return an image URL.');

    console.log('[OK] API smoke test passed.');
  } finally {
    await fetch(`${baseUrl}/api/generation/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelPreset: 'sdxl-base',
        modelAir: 'urn:air:sdxl:checkpoint:civitai:101055@128078',
        width: 1024,
        height: 1024,
        steps: 28,
        cfgScale: 5,
        batch: 1,
        seed: null,
        negativePromptExtra: '',
        loras: []
      })
    }).catch(() => undefined);
    child.kill('SIGTERM');
    await delay(300);
    if (!child.killed) child.kill('SIGKILL');
    if (stderr.trim()) console.log(`[INFO] Server stderr during smoke test:\n${stderr.trim()}`);
    if (!stdout.includes('Guess The Prompt server running')) console.log(`[INFO] Server stdout during smoke test:\n${stdout.trim()}`);
  }
}

async function runGameEngineSmokeTest() {
  process.env.APP_MODE = 'mock';
  const { GameEngine } = await import('../dist-server/services/GameEngine.js');
  const engine = new GameEngine();
  engine.resetLeaderboard();

  const round = await engine.startRound('adventure', 'hard');
  await engine.generate(round.id);
  const answer = engine.promptPreview().find((prompt) => prompt.title === round.title)?.answer;
  assert(answer, 'Unable to recover expected answer from prompt preview for smoke test.');

  const solvedRound = engine.guess(round.id, answer);
  assert(solvedRound.solved === true, 'Exact answer did not solve the round.');
  assert(solvedRound.scoreBreakdown?.total > 0, 'Solved round did not generate a score.');

  const leaderboard = engine.leaderboard();
  assert(leaderboard.entries.length === 1, 'Leaderboard did not record the solved round.');
  assert(leaderboard.entries[0].rank === 1, 'Leaderboard rank was not assigned.');
  assert(leaderboard.summary.solvedRounds === 1, 'Leaderboard summary did not count the solved round.');

  engine.resetLeaderboard();
  console.log('[OK] Game engine smoke test passed.');
}

await runApiSmokeTest();
await runGameEngineSmokeTest();
console.log('[OK] All smoke tests passed.');
