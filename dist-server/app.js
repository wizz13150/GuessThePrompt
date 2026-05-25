import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { GameEngine } from './services/GameEngine.js';
import { log, logError, readRecentLogs } from './services/logger.js';
const app = new Hono();
const engine = new GameEngine();
const startedAt = Date.now();
const APP_VERSION = '1.9.0-public-demo';
const distDir = resolve(process.cwd(), 'dist');
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
};
function readDistFile(relativePath) {
    const normalized = normalize(relativePath).replace(/^([/\\])+/, '');
    const filePath = resolve(join(distDir, normalized));
    if (!filePath.startsWith(distDir) || !existsSync(filePath))
        return null;
    return { filePath, buffer: readFileSync(filePath), contentType: MIME_TYPES[extname(filePath)] ?? 'application/octet-stream' };
}
function serveIndex(c) {
    const file = readDistFile('index.html');
    if (!file)
        return c.text('Production build missing. Run npm run build.', 500);
    return c.body(file.buffer, 200, { 'content-type': file.contentType, 'cache-control': 'no-store' });
}
function appMode() {
    const mode = (process.env.APP_MODE || 'civitai').toLowerCase();
    if (mode === 'mock')
        return 'mock';
    return 'civitai';
}
function sanitizeUsername(value) {
    const raw = typeof value === 'string' ? value : '';
    const cleaned = raw.replace(/[^a-zA-Z0-9_.@ -]/g, '').replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, 40) || process.env.PLAYER_NAME || 'Guest';
}
function sanitizeApiKey(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function requestContext(c) {
    return {
        username: sanitizeUsername(c.req.header('x-player-name')),
        civitaiApiKey: sanitizeApiKey(c.req.header('x-civitai-api-key'))
    };
}
function hasCivitaiApiKey(c) {
    const requestKey = c ? requestContext(c).civitaiApiKey : '';
    return Boolean((requestKey && requestKey.length >= 20) || (process.env.CIVITAI_API_KEY && process.env.CIVITAI_API_KEY.trim().length >= 20));
}
app.use('*', secureHeaders());
app.use('/api/*', cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    allowHeaders: ['Content-Type', 'X-Civitai-API-Key', 'X-Player-Name'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));
app.use('/api/*', async (c, next) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    c.header('x-request-id', requestId);
    log('INFO', 'http', `${c.req.method} ${c.req.path} started`, { requestId });
    try {
        await next();
        log('OK', 'http', `${c.req.method} ${c.req.path} finished`, { requestId, status: c.res.status, durationMs: Date.now() - startedAt });
    }
    catch (error) {
        logError('http', `${c.req.method} ${c.req.path} crashed`, error, { requestId, durationMs: Date.now() - startedAt });
        throw error;
    }
});
app.get('/api/health', (c) => c.json({
    status: 'ok',
    version: APP_VERSION,
    mode: appMode(),
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    civitai: {
        apiKeyConfigured: hasCivitaiApiKey(c),
        orchestratorEnabled: appMode() === 'civitai',
        publicImageProviderEnabled: false,
        modelAir: process.env.CIVITAI_MODEL_AIR || 'urn:air:sdxl:checkpoint:civitai:101055@128078'
    },
    promptCache: engine.promptStats()
}));
app.get('/api/debug/logs', (c) => {
    const limit = Number.isFinite(Number(c.req.query('limit'))) ? Number(c.req.query('limit')) : 160;
    return c.json({ logs: readRecentLogs(limit) });
});
app.post('/api/debug/orchestrator-test', async (c) => {
    try {
        const round = await engine.startRound('classic', 'easy');
        const estimate = await engine.estimate(round.id, requestContext(c));
        return c.json({ ok: true, roundId: round.id, estimate });
    }
    catch (error) {
        logError('debug', 'Orchestrator test failed', error);
        return c.json({ ok: false, error: error instanceof Error ? error.message : 'debug_test_failed' }, 502);
    }
});
app.get('/api/me', (c) => {
    const context = requestContext(c);
    const hasKey = hasCivitaiApiKey(c);
    return c.json({
        authenticated: appMode() === 'mock' || hasKey,
        mode: appMode(),
        user: {
            id: appMode() === 'civitai' ? `civitai-session-${context.username.toLowerCase()}` : 'mock-user',
            username: context.username,
            buzzBalance: appMode() === 'mock' ? 250 : 0,
            avatarUrl: null,
            grantedScopes: appMode() === 'civitai'
                ? [hasKey ? 'Visitor supplied API key' : 'Missing visitor API key', 'Civitai orchestrator generation', 'Prompt cache sync']
                : ['Mock diagnostics', 'Local SVG generation']
        }
    });
});
app.post('/api/auth/login', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const username = sanitizeUsername(body.username ?? c.req.header('x-player-name'));
    const apiKey = sanitizeApiKey(body.apiKey ?? c.req.header('x-civitai-api-key'));
    if (appMode() === 'civitai' && apiKey.length < 20) {
        return c.json({ ok: false, mode: appMode(), error: 'A Civitai API Key is required and must be entered by the visitor.' }, 400);
    }
    return c.json({
        ok: true,
        mode: appMode(),
        message: appMode() === 'civitai' ? 'Public demo session is ready. The server will use this visitor key only for the current requests.' : 'Local mock session is ready.',
        user: { username }
    });
});
app.post('/api/auth/logout', (c) => c.json({ ok: true }));
app.get('/api/prompts/cache-preview', (c) => c.json({ prompts: engine.promptPreview(), stats: engine.promptStats() }));
app.post('/api/prompts/sync-civitai', async (c) => {
    try {
        const body = await c.req.json().catch(() => ({}));
        const limit = Number.isFinite(Number(body.limit)) ? Number(body.limit) : 60;
        const result = await engine.syncCivitaiPrompts(limit, requestContext(c));
        return c.json(result);
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'civitai_prompt_sync_failed' }, 502);
    }
});
app.get('/api/leaderboard', (c) => c.json({ leaderboard: engine.leaderboard(10, requestContext(c)) }));
app.post('/api/leaderboard/reset', (c) => c.json({ leaderboard: engine.resetLeaderboard(requestContext(c)) }));
app.get('/api/generation/settings', (c) => c.json(engine.generationSettings()));
app.post('/api/generation/settings', async (c) => {
    try {
        const body = await c.req.json().catch(() => ({}));
        return c.json(engine.updateGenerationSettings(body));
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'generation_settings_update_failed' }, 400);
    }
});
app.post('/api/game/new-round', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const mode = (body.mode === 'classic' ? 'classic' : 'adventure');
    const difficulty = (['easy', 'normal', 'hard'].includes(body.difficulty) ? body.difficulty : 'normal');
    return c.json({ round: await engine.startRound(mode, difficulty) });
});
app.post('/api/game/:id/estimate', async (c) => {
    try {
        const estimate = await engine.estimate(c.req.param('id'), requestContext(c));
        return c.json({ estimate });
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'estimate_failed' }, 404);
    }
});
app.post('/api/game/:id/generate', async (c) => {
    try {
        const round = await engine.generate(c.req.param('id'), requestContext(c));
        return c.json({ round });
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'generation_failed' }, 502);
    }
});
app.post('/api/game/:id/reroll', async (c) => {
    try {
        const round = await engine.reroll(c.req.param('id'), requestContext(c));
        return c.json({ round });
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'reroll_failed' }, 502);
    }
});
app.post('/api/game/:id/guess', async (c) => {
    try {
        const body = await c.req.json().catch(() => ({}));
        const round = engine.guess(c.req.param('id'), String(body.guess ?? ''), requestContext(c));
        return c.json({ round, leaderboard: engine.leaderboard(10, requestContext(c)) });
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'guess_failed' }, 404);
    }
});
app.post('/api/game/:id/hint', (c) => {
    try {
        const payload = engine.hint(c.req.param('id'));
        return c.json(payload);
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'hint_failed' }, 409);
    }
});
app.post('/api/game/:id/give-up', (c) => {
    try {
        const round = engine.giveUp(c.req.param('id'));
        return c.json({ round, leaderboard: engine.leaderboard(10, requestContext(c)) });
    }
    catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'give_up_failed' }, 404);
    }
});
app.get('/assets/*', (c) => {
    const file = readDistFile(c.req.path.slice(1));
    if (!file)
        return c.text('Asset not found', 404);
    return c.body(file.buffer, 200, { 'content-type': file.contentType, 'cache-control': 'public, max-age=31536000, immutable' });
});
app.get('/manifest.webmanifest', (c) => {
    const file = readDistFile('manifest.webmanifest');
    if (!file)
        return c.text('Manifest not found', 404);
    return c.body(file.buffer, 200, { 'content-type': file.contentType, 'cache-control': 'no-cache' });
});
app.get('/', serveIndex);
app.get('/:tab{play|explore|config|leaderboard|about}', serveIndex);
app.get('*', (c) => c.req.path.startsWith('/api/') ? c.text('API route not found', 404) : serveIndex(c));
export default app;
