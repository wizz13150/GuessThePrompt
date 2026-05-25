import { randomUUID } from 'node:crypto';
import { isPromptSafe, sanitizePrompt } from './PromptSanitizer.js';
const STOP_WORDS = new Set([
    'with', 'from', 'into', 'onto', 'over', 'under', 'through', 'cinematic', 'lighting', 'highly', 'detailed', 'quality', 'masterpiece',
    'best', 'realistic', 'photorealistic', 'portrait', 'beautiful', 'ultra', 'sharp', 'focus', 'style', 'render', 'image', 'photo', 'art',
    'digital', 'concept', 'scene', 'view', 'background', 'foreground', 'atmosphere', 'dramatic', 'volumetric', 'composition', 'intricate',
    'high', 'resolution', 'hyper', 'epic', 'fantasy', 'scifi', 'science', 'fiction', 'anime', 'woman', 'girl', 'man', 'boy', 'person'
]);
function isUnsafeNsfw(value) {
    if (value === true)
        return true;
    if (typeof value === 'string')
        return ['true', 'soft', 'mature', 'x'].includes(value.toLowerCase());
    return false;
}
function splitPromptTokens(prompt) {
    return prompt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\([^)]*:[^)]+\)/g, ' ')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((token) => token.replace(/^-+|-+$/g, '').trim())
        .filter((token) => token.length >= 4 && token.length <= 18 && !STOP_WORDS.has(token));
}
function deriveAnswer(prompt, fallbackId) {
    const tokens = splitPromptTokens(prompt);
    const frequency = new Map();
    for (const token of tokens)
        frequency.set(token, (frequency.get(token) ?? 0) + 1);
    const sorted = [...frequency.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
    return sorted[0]?.[0] ?? `image-${fallbackId}`;
}
function titleFromAnswer(answer, prompt) {
    const firstClause = prompt.split(/[,.]/)[0]?.trim();
    if (firstClause && firstClause.length >= 8 && firstClause.length <= 48) {
        return firstClause.charAt(0).toUpperCase() + firstClause.slice(1);
    }
    return `Civitai ${answer}`.replace(/\b\w/g, (char) => char.toUpperCase());
}
function scoreImage(item, prompt) {
    const stats = item.stats ?? {};
    const reactions = (stats.likeCount ?? 0) + (stats.heartCount ?? 0) + (stats.laughCount ?? 0) + (stats.cryCount ?? 0);
    const promptLengthScore = Math.min(30, Math.floor(prompt.length / 18));
    const reactionScore = Math.min(30, Math.floor(reactions / 4));
    const detailScore = prompt.includes(',') ? 15 : 0;
    return Math.max(55, Math.min(99, 55 + promptLengthScore + reactionScore + detailScore));
}
function tagsFromPrompt(prompt, answer) {
    const tokens = splitPromptTokens(prompt).filter((token) => token !== answer);
    return [...new Set(tokens)].slice(0, 4);
}
export class CivitaiPromptImporter {
    apiKey;
    constructor(apiKey = (process.env.CIVITAI_API_KEY || '').trim()) {
        this.apiKey = apiKey;
    }
    async importFromImages(limit = 300) {
        const target = Math.max(50, Math.min(limit, 800));
        const pageSize = 100;
        const items = [];
        let cursor = '';
        const seenImageIds = new Set();
        while (items.length < target) {
            const url = new URL('https://civitai.com/api/v1/images');
            url.searchParams.set('limit', String(Math.min(pageSize, target - items.length)));
            url.searchParams.set('nsfw', 'false');
            url.searchParams.set('sort', 'Most Reactions');
            url.searchParams.set('period', 'Month');
            if (cursor)
                url.searchParams.set('cursor', cursor);
            const response = await fetch(url, {
                headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined
            });
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(`Civitai images API HTTP ${response.status}: ${text.slice(0, 240)}`);
            }
            const payload = (await response.json());
            const pageItems = payload.items ?? [];
            for (const item of pageItems) {
                const id = String(item.id ?? item.url ?? randomUUID());
                if (seenImageIds.has(id))
                    continue;
                seenImageIds.add(id);
                items.push(item);
            }
            const nextCursor = payload.metadata?.nextCursor || '';
            if (!nextCursor || nextCursor === cursor || pageItems.length === 0)
                break;
            cursor = nextCursor;
        }
        const imported = [];
        const seenPromptKeys = new Set();
        let skipped = 0;
        for (const item of items) {
            const prompt = item.meta?.prompt?.trim();
            if (!prompt || prompt.length < 60 || prompt.length > 1200 || isUnsafeNsfw(item.nsfw) || !isPromptSafe(prompt)) {
                skipped += 1;
                continue;
            }
            const answer = deriveAnswer(prompt, String(item.id ?? randomUUID()).slice(0, 8));
            if (!answer || answer.startsWith('image-')) {
                skipped += 1;
                continue;
            }
            const cleanPrompt = sanitizePrompt(prompt);
            const promptKey = `${answer}::${cleanPrompt.toLowerCase().replace(/\s+/g, ' ').slice(0, 320)}`;
            if (seenPromptKeys.has(promptKey)) {
                skipped += 1;
                continue;
            }
            seenPromptKeys.add(promptKey);
            const imageId = item.id ?? randomUUID();
            imported.push({
                id: `civitai-live-${imageId}`,
                answer,
                title: titleFromAnswer(answer, cleanPrompt),
                prompt: cleanPrompt,
                negativePrompt: item.meta?.negativePrompt || item.meta?.NegativePrompt || 'nsfw, nude, naked, low quality, blurry, text, watermark, signature',
                tags: tagsFromPrompt(cleanPrompt, answer),
                source: 'civitai-live-cache',
                nsfw: false,
                sourceImageUrl: item.url,
                sourceImagePageUrl: item.postId ? `https://civitai.com/posts/${item.postId}` : undefined,
                modelHint: item.meta?.Model || item.meta?.model || `Civitai image ${item.id ?? 'unknown'}`,
                qualityScore: scoreImage(item, cleanPrompt)
            });
        }
        return { imported, scanned: items.length, skipped, source: 'https://civitai.com/api/v1/images' };
    }
}
