import { log, logError } from './logger.js';
const DEFAULT_ORCHESTRATOR_BASE_URL = 'https://orchestration.civitai.com';
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'expired', 'canceled']);
const FLUX_LIKE_PREFIXES = ['urn:air:flux2:', 'urn:air:fluxkrea:', 'urn:air:zimageturbo:'];
function isFluxLike(settings) {
    return settings.modelPreset === 'flux2-klein-9b'
        || settings.modelPreset === 'flux-krea-dev'
        || settings.modelPreset === 'z-image-turbo'
        || FLUX_LIKE_PREFIXES.some((prefix) => settings.modelAir.startsWith(prefix));
}
function supportsNegativePrompt(settings) {
    return settings.modelPreset === 'sdxl-base' || settings.modelAir.startsWith('urn:air:sdxl:');
}
function buzzFallback(difficulty, settings) {
    void difficulty;
    const sizeFactor = Math.max(1, (settings.width * settings.height) / (1024 * 1024));
    const batch = Math.max(1, settings.batch);
    // Conservative local fallback only when Civitai's what-if response does not expose a debit.
    // Civitai often prices these small one-step workflows as 1 Buzz per 1024px image.
    return Math.max(1, Math.ceil(sizeFactor * batch));
}
function buildPrompt(record, settings) {
    void settings;
    // LoRA support is intentionally paused in v1.5.
    // Keep the prompt clean until the workflow payload is fully validated for Civitai LoRA resources.
    return record.prompt;
}
function buildNegativePrompt(record, settings) {
    if (!supportsNegativePrompt(settings))
        return '';
    return [record.negativePrompt, settings.negativePromptExtra].filter(Boolean).join(', ');
}
function enabledLoras(settings) {
    void settings;
    return [];
}
function aspectRatio(settings) {
    if (settings.width === settings.height)
        return '1:1';
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(settings.width, settings.height);
    return `${settings.width / divisor}:${settings.height / divisor}`;
}
function generatorKind(_settings) {
    return 'textToImage';
}
function modelDisplayName(settings) {
    if (settings.modelPreset === 'flux2-klein-9b' || settings.modelAir.startsWith('urn:air:flux2:'))
        return 'Flux.2 Klein 9B';
    if (settings.modelPreset === 'flux-krea-dev' || settings.modelAir.startsWith('urn:air:fluxkrea:'))
        return 'Flux.1 Krea Dev';
    if (settings.modelPreset === 'z-image-turbo' || settings.modelAir.startsWith('urn:air:zimageturbo:'))
        return 'Z-Image Turbo';
    if (settings.modelPreset === 'sdxl-base' || settings.modelAir.startsWith('urn:air:sdxl:'))
        return 'SDXL';
    return 'Custom model';
}
function cfgScaleForPayload(settings) {
    if (settings.modelPreset === 'flux2-klein-9b' || settings.modelAir.startsWith('urn:air:flux2:'))
        return null;
    if (settings.modelPreset === 'z-image-turbo' || settings.modelAir.startsWith('urn:air:zimageturbo:'))
        return 1;
    return settings.cfgScale;
}
function buildTextToImageBody(record, difficulty, settings) {
    const loras = enabledLoras(settings);
    void loras;
    const negativePrompt = buildNegativePrompt(record, settings);
    const input = {
        prompt: buildPrompt(record, settings),
        model: settings.modelAir,
        width: settings.width,
        height: settings.height,
        steps: settings.steps,
        quantity: settings.batch
    };
    if (negativePrompt)
        input.negativePrompt = negativePrompt;
    const cfgScale = cfgScaleForPayload(settings);
    if (cfgScale !== null)
        input.cfgScale = cfgScale;
    if (settings.seed !== null)
        input.seed = settings.seed;
    return {
        tags: ['guess-the-prompt', 'minigame', record.source, difficulty],
        allowMatureContent: false,
        steps: [
            {
                $type: 'textToImage',
                name: 'mystery_image',
                timeout: '00:10:00',
                input
            }
        ]
    };
}
function buildGenerationBody(record, difficulty, settings) {
    return buildTextToImageBody(record, difficulty, settings);
}
function humanizeOrchestratorError(status, payload, text) {
    const raw = typeof payload === 'object' && payload ? JSON.stringify(payload) : text;
    const parsed = typeof payload === 'object' && payload ? payload : {};
    const title = typeof parsed.title === 'string' ? parsed.title : '';
    const errors = parsed.errors && typeof parsed.errors === 'object' ? parsed.errors : {};
    const messages = Array.isArray(errors.messages) ? errors.messages.filter((item) => typeof item === 'string') : [];
    const validationMessages = Object.entries(errors)
        .flatMap(([field, value]) => Array.isArray(value) ? value.map((item) => `${field}: ${String(item)}`) : [`${field}: ${String(value)}`]);
    const firstMessage = messages[0] || validationMessages[0] || (typeof parsed.detail === 'string' ? parsed.detail : '') || title || text.slice(0, 240);
    if (/not enabled for generation/i.test(firstMessage)) {
        return `Civitai rejected the selected model because it is not enabled for Generator. Open Config and choose another preset. (${firstMessage})`;
    }
    if (/validation/i.test(title) || messages.length) {
        return `Civitai rejected the workflow payload: ${firstMessage}`;
    }
    return `Civitai orchestrator HTTP ${status}: ${raw.slice(0, 500)}`;
}
function extractImageUrls(snapshot, allowPreviewFallback = false) {
    const urls = [];
    for (const step of snapshot.steps ?? []) {
        for (const image of step.output?.images ?? []) {
            if (image.available !== false && image.url) {
                urls.push(image.url);
            }
            else if (allowPreviewFallback) {
                const fallbackUrl = image.previewUrl || image.url;
                if (fallbackUrl)
                    urls.push(fallbackUrl);
            }
        }
        for (const blob of step.output?.blobs ?? []) {
            const type = blob.mimeType ?? blob.type ?? '';
            if (blob.url && (!type || type.startsWith('image/')))
                urls.push(blob.url);
        }
    }
    return [...new Set(urls)];
}
function extractDebitedBuzz(snapshot) {
    const debits = snapshot.transactions?.list
        ?.filter((transaction) => transaction.type === 'debit' && typeof transaction.amount === 'number')
        .map((transaction) => transaction.amount || 0) ?? [];
    if (debits.length)
        return Math.ceil(debits.reduce((total, amount) => total + amount, 0));
    if (typeof snapshot.cost?.total === 'number' && snapshot.cost.total > 0)
        return Math.ceil(snapshot.cost.total);
    return null;
}
function resolvedBuzzCost(snapshot, difficulty, settings) {
    return extractDebitedBuzz(snapshot) ?? buzzFallback(difficulty, settings);
}
async function sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
export class CivitaiGenerationProvider {
    getBaseUrl() {
        return process.env.CIVITAI_ORCHESTRATOR_URL || DEFAULT_ORCHESTRATOR_BASE_URL;
    }
    getApiKey(context) {
        return (context?.civitaiApiKey || process.env.CIVITAI_API_KEY || '').trim();
    }
    requireApiKey(context) {
        const apiKey = this.getApiKey(context);
        if (!apiKey)
            throw new Error('A Civitai API Key is required for this action. Enter your own key in the public demo session panel.');
        if (apiKey.length < 20)
            throw new Error('The provided Civitai API Key looks too short. Check the key and try again.');
        return apiKey;
    }
    async callOrchestrator(path, init, timeoutMs = 45_000, context) {
        const apiKey = this.requireApiKey(context);
        const baseUrl = this.getBaseUrl();
        const method = init.method ?? 'GET';
        const startedAt = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        log('INFO', 'civitai', `${method} ${path} started`, { baseUrl, timeoutMs, apiKeyConfigured: apiKey.length >= 20 });
        try {
            const response = await fetch(`${baseUrl}${path}`, {
                ...init,
                signal: controller.signal,
                headers: {
                    'content-type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                    ...(init.headers ?? {})
                }
            });
            const text = await response.text();
            let payload = null;
            try {
                payload = text ? JSON.parse(text) : null;
            }
            catch {
                payload = { raw: text };
            }
            const durationMs = Date.now() - startedAt;
            log(response.ok ? 'OK' : 'ERROR', 'civitai', `${method} ${path} finished`, { status: response.status, statusText: response.statusText, durationMs, bodyPreview: text.slice(0, 500) });
            if (!response.ok) {
                throw new Error(humanizeOrchestratorError(response.status, payload, text));
            }
            return payload;
        }
        catch (error) {
            const durationMs = Date.now() - startedAt;
            if (error instanceof Error && error.name === 'AbortError') {
                const timeoutError = new Error(`Civitai orchestrator timeout after ${timeoutMs}ms on ${method} ${path}.`);
                logError('civitai', `${method} ${path} timed out`, timeoutError, { durationMs });
                throw timeoutError;
            }
            logError('civitai', `${method} ${path} failed`, error, { durationMs });
            throw error;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async estimate(record, difficulty, settings, context) {
        const body = buildGenerationBody(record, difficulty, settings);
        log('INFO', 'generation', 'Estimating Civitai image cost', {
            title: record.title,
            answerLength: record.answer.length,
            difficulty,
            model: settings.modelAir,
            modelName: modelDisplayName(settings),
            stepType: generatorKind(settings),
            promptLength: record.prompt.length,
            width: settings.width,
            height: settings.height,
            batch: settings.batch,
            steps: settings.steps,
            loraCount: enabledLoras(settings).length,
            negativePromptSent: Boolean(buildNegativePrompt(record, settings)),
            cfgSent: cfgScaleForPayload(settings) !== null,
            bodyPreview: JSON.stringify(body).slice(0, 1200)
        });
        const snapshot = await this.callOrchestrator('/v2/consumer/workflows?whatif=true', { method: 'POST', body: JSON.stringify(body) }, 45_000, context);
        const debitedBuzz = extractDebitedBuzz(snapshot);
        const fallbackBuzz = buzzFallback(difficulty, settings);
        const buzzCost = debitedBuzz ?? fallbackBuzz;
        log('OK', 'generation', 'Civitai estimate received', { workflowId: snapshot.id, status: snapshot.status, cost: snapshot.cost, debitedBuzz, fallbackBuzz, buzzCost });
        return {
            buzzCost,
            provider: 'civitai',
            width: settings.width,
            height: settings.height,
            steps: settings.steps,
            batch: settings.batch,
            cfgScale: cfgScaleForPayload(settings),
            modelHint: `${modelDisplayName(settings)} · ${settings.modelAir}`,
            modelAir: settings.modelAir
        };
    }
    async generate(record, difficulty, settings, context) {
        const body = buildGenerationBody(record, difficulty, settings);
        log('INFO', 'generation', 'Submitting Civitai image workflow', {
            title: record.title,
            answerLength: record.answer.length,
            difficulty,
            model: settings.modelAir,
            modelName: modelDisplayName(settings),
            stepType: generatorKind(settings),
            promptLength: record.prompt.length,
            width: settings.width,
            height: settings.height,
            batch: settings.batch,
            steps: settings.steps,
            cfgScale: cfgScaleForPayload(settings),
            loraCount: enabledLoras(settings).length,
            negativePromptSent: Boolean(buildNegativePrompt(record, settings)),
            cfgSent: cfgScaleForPayload(settings) !== null
        });
        const submitted = await this.callOrchestrator('/v2/consumer/workflows', { method: 'POST', body: JSON.stringify(body) }, 45_000, context);
        let snapshot = submitted;
        log('OK', 'generation', 'Civitai workflow submitted', { workflowId: snapshot.id, status: snapshot.status, cost: snapshot.cost });
        const startedAt = Date.now();
        const timeoutMs = Number(process.env.CIVITAI_GENERATION_TIMEOUT_MS ?? 120000);
        while (!TERMINAL_STATUSES.has(String(snapshot.status)) && Date.now() - startedAt < timeoutMs) {
            await sleep(1500);
            snapshot = await this.callOrchestrator(`/v2/consumer/workflows/${encodeURIComponent(snapshot.id)}`, { method: 'GET' }, 30_000, context);
            const availableCount = extractImageUrls(snapshot, false).length;
            const previewCount = extractImageUrls(snapshot, true).length;
            log('INFO', 'generation', 'Civitai workflow poll', { workflowId: snapshot.id, status: snapshot.status, availableImageCount: availableCount, previewImageCount: previewCount });
            const [earlyImageUrl] = extractImageUrls(snapshot, false);
            if (earlyImageUrl) {
                log('OK', 'generation', 'Civitai image became available before terminal status', { workflowId: snapshot.id, imageUrlPreview: earlyImageUrl.slice(0, 140) });
                return { imageUrl: earlyImageUrl, imageUrls: extractImageUrls(snapshot, false), provider: 'civitai', workflowId: snapshot.id };
            }
        }
        const [availableImageUrl] = extractImageUrls(snapshot, false);
        if (availableImageUrl) {
            log('OK', 'generation', 'Civitai available image URL extracted', { workflowId: snapshot.id, status: snapshot.status, imageUrlPreview: availableImageUrl.slice(0, 140) });
            return { imageUrl: availableImageUrl, imageUrls: extractImageUrls(snapshot, false), provider: 'civitai', workflowId: snapshot.id };
        }
        const [fallbackImageUrl] = extractImageUrls(snapshot, true);
        if (fallbackImageUrl) {
            log('WARN', 'generation', 'Civitai workflow did not succeed but returned a preview URL; using it for gameplay instead of discarding the round', { workflowId: snapshot.id, status: snapshot.status, imageUrlPreview: fallbackImageUrl.slice(0, 140) });
            return { imageUrl: fallbackImageUrl, imageUrls: extractImageUrls(snapshot, true), provider: 'civitai-preview', workflowId: snapshot.id };
        }
        if (snapshot.status !== 'succeeded') {
            log('ERROR', 'generation', 'Civitai workflow did not succeed', { workflowId: snapshot.id, status: snapshot.status, snapshot });
            throw new Error(`Civitai workflow ${snapshot.id} ended with status "${snapshot.status}" and returned no displayable image URL.`);
        }
        const [imageUrl] = extractImageUrls(snapshot);
        if (!imageUrl)
            throw new Error(`Civitai workflow ${snapshot.id} succeeded but no image URL was returned.`);
        log('OK', 'generation', 'Civitai image URL extracted', { workflowId: snapshot.id, imageUrlPreview: imageUrl.slice(0, 140) });
        return { imageUrl, imageUrls: extractImageUrls(snapshot, false), provider: 'civitai', workflowId: snapshot.id };
    }
}
