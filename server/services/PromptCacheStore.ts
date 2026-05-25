import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PROMPT_SAMPLES } from '../data/promptSamples.js';
import { isPromptSafe, sanitizePrompt } from './PromptSanitizer.js';
import type { PromptRecord } from './types.js';

const DEFAULT_CACHE_PATH = join(process.cwd(), 'server', 'data', 'civitai.prompt-cache.json');

function readImportedCache(path: string): PromptRecord[] {
  try {
    if (!existsSync(path)) return [];
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    return Array.isArray(parsed) ? (parsed as PromptRecord[]) : [];
  } catch {
    return [];
  }
}

function normalizeRecord(record: PromptRecord): PromptRecord | null {
  if (record.nsfw || !record.prompt || !isPromptSafe(record.prompt)) return null;
  return {
    ...record,
    answer: String(record.answer ?? '').trim().toLowerCase(),
    title: String(record.title ?? record.answer ?? 'Untitled prompt').trim(),
    prompt: sanitizePrompt(record.prompt),
    negativePrompt: record.negativePrompt || 'nsfw, nude, naked, low quality, blurry, text, watermark',
    tags: Array.isArray(record.tags) ? record.tags.slice(0, 8) : [],
    source: record.source || 'local-cache',
    qualityScore: Number.isFinite(record.qualityScore) ? Math.max(0, Math.min(100, Math.round(record.qualityScore))) : 70,
    modelHint: record.modelHint || 'Unknown Civitai model'
  };
}

function uniqueById(records: PromptRecord[]): PromptRecord[] {
  const byKey = new Map<string, PromptRecord>();
  for (const record of records) {
    const promptKey = sanitizePrompt(record.prompt || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 800);
    const answerKey = String(record.answer || '').trim().toLowerCase();
    const key = `${answerKey}::${promptKey}` || record.id;
    const existing = byKey.get(key);
    if (!existing || record.qualityScore > existing.qualityScore) byKey.set(key, record);
  }
  return [...byKey.values()];
}

export class PromptCacheStore {
  private prompts: PromptRecord[];

  constructor(seedRecords: PromptRecord[] = PROMPT_SAMPLES, private readonly cachePath = DEFAULT_CACHE_PATH) {
    const imported = readImportedCache(cachePath);
    this.prompts = this.prepare([...imported, ...seedRecords]);

    if (this.prompts.length === 0) {
      throw new Error('Prompt cache is empty after safety filtering. Check promptSamples.ts or the Civitai cache importer.');
    }
  }

  private prepare(records: PromptRecord[]) {
    return uniqueById(records)
      .map(normalizeRecord)
      .filter((record): record is PromptRecord => Boolean(record))
      .sort((a, b) => b.qualityScore - a.qualityScore);
  }

  addImportedPrompts(records: PromptRecord[]) {
    const normalizedImported = this.prepare(records);
    const existingImported = this.prompts.filter((record) => record.source === 'civitai-live-cache');
    const mergedImported = uniqueById([...normalizedImported, ...existingImported]).sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 800);
    const builtIn = this.prompts.filter((record) => record.source !== 'civitai-live-cache');
    this.prompts = this.prepare([...mergedImported, ...builtIn]);
    this.persistImported(mergedImported);
    return {
      imported: normalizedImported.length,
      retainedLiveCache: mergedImported.length,
      totalCache: this.prompts.length
    };
  }

  private persistImported(records: PromptRecord[]) {
    mkdirSync(dirname(this.cachePath), { recursive: true });
    writeFileSync(this.cachePath, JSON.stringify(records, null, 2), 'utf8');
  }

  hasLiveImagePrompts() {
    return this.prompts.some((record) => record.source === 'civitai-live-cache' && Boolean(record.sourceImageUrl));
  }

  stats() {
    return {
      total: this.prompts.length,
      live: this.prompts.filter((record) => record.source === 'civitai-live-cache').length,
      samples: this.prompts.filter((record) => record.source !== 'civitai-live-cache').length,
      bestQuality: this.prompts[0]?.qualityScore ?? 0,
      cachePath: this.cachePath
    };
  }

  listSafePreview() {
    return this.prompts.map((record) => ({
      id: record.id,
      answer: record.answer,
      title: record.title,
      tags: record.tags,
      source: record.source,
      qualityScore: record.qualityScore,
      modelHint: record.modelHint,
      hasSourceImage: Boolean(record.sourceImageUrl),
      sourceImagePageUrl: record.sourceImagePageUrl
    }));
  }

  pickAdventurePrompt(): PromptRecord {
    const highQualityLive = this.prompts.filter((record) => record.source === 'civitai-live-cache' && record.qualityScore >= 70);
    const highQuality = this.prompts.filter((record) => record.qualityScore >= 80);
    const pool = highQualityLive.length ? highQualityLive : highQuality.length ? highQuality : this.prompts;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  pickClassicPrompt(): PromptRecord {
    const base = this.prompts[Math.floor(Math.random() * this.prompts.length)];
    return {
      ...base,
      title: 'Classic mystery image',
      prompt: `${base.answer}, clean centered subject, game illustration, readable silhouette, high detail, vibrant lighting`,
      tags: ['classic mode', ...base.tags.slice(0, 2)]
    };
  }
}
