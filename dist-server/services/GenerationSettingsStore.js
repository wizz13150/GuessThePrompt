import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DEFAULT_GENERATION_SETTINGS, DEFAULT_MODEL_AIR, MODEL_PRESETS } from './types.js';
const SETTINGS_PATH = resolve(process.cwd(), 'server', 'data', 'generation-settings.local.json');
const DIMENSIONS = new Set([512, 640, 768, 832, 896, 1024, 1152, 1216, 1344]);
const ALLOWED_PRESETS = new Set(MODEL_PRESETS.map((preset) => preset.id));
function presetFor(modelPreset) {
    return MODEL_PRESETS.find((preset) => preset.id === modelPreset);
}
function isSdxlPreset(modelPreset, modelAir) {
    return modelPreset === 'sdxl-base' || modelAir.startsWith('urn:air:sdxl:');
}
function isKleinPreset(modelPreset, modelAir) {
    return modelPreset === 'flux2-klein-9b' || modelAir.startsWith('urn:air:flux2:');
}
function isZImagePreset(modelPreset, modelAir) {
    return modelPreset === 'z-image-turbo' || modelAir.startsWith('urn:air:zimageturbo:');
}
const RETIRED_MODEL_AIRS = new Set([
    'urn:air:sdxl:checkpoint:civitai:119229@916744',
    'urn:air:flux1:checkpoint:civitai:1830404@2071376'
]);
function clampNumber(value, fallback, min, max, integer = true) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    const clamped = Math.min(max, Math.max(min, parsed));
    return integer ? Math.round(clamped) : Number(clamped.toFixed(2));
}
function normalizeDimension(value, fallback) {
    const parsed = clampNumber(value, fallback, 512, 1344, true);
    if (DIMENSIONS.has(parsed))
        return parsed;
    return [...DIMENSIONS].reduce((closest, candidate) => Math.abs(candidate - parsed) < Math.abs(closest - parsed) ? candidate : closest, fallback);
}
function normalizeLoras(input) {
    if (!Array.isArray(input))
        return [];
    return input.slice(0, 4).map((item, index) => {
        const candidate = typeof item === 'object' && item ? item : {};
        return {
            id: String(candidate.id || `lora-${index + 1}`),
            enabled: Boolean(candidate.enabled),
            air: String(candidate.air || '').trim(),
            strength: clampNumber(candidate.strength, 0.75, -2, 2, false),
            triggerWords: String(candidate.triggerWords || '').trim()
        };
    });
}
export class GenerationSettingsStore {
    get presets() {
        return MODEL_PRESETS;
    }
    read() {
        if (!existsSync(SETTINGS_PATH))
            return { ...DEFAULT_GENERATION_SETTINGS, loras: [] };
        try {
            const parsed = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
            return this.normalize(parsed);
        }
        catch {
            return { ...DEFAULT_GENERATION_SETTINGS, loras: [] };
        }
    }
    update(patch) {
        const current = this.read();
        const normalized = this.normalize({ ...current, ...patch });
        mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
        writeFileSync(SETTINGS_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
        return normalized;
    }
    normalize(input) {
        const requestedPreset = String(input.modelPreset || '');
        const modelPreset = ALLOWED_PRESETS.has(requestedPreset)
            ? requestedPreset
            : DEFAULT_GENERATION_SETTINGS.modelPreset;
        const activePreset = presetFor(modelPreset);
        const presetAir = activePreset?.air || DEFAULT_MODEL_AIR;
        const requestedAir = String(input.modelAir || DEFAULT_MODEL_AIR).trim();
        const modelAir = modelPreset === 'custom-air'
            ? (RETIRED_MODEL_AIRS.has(requestedAir) ? DEFAULT_MODEL_AIR : requestedAir)
            : presetAir;
        const resolvedAir = modelAir || DEFAULT_MODEL_AIR;
        const normalizedSteps = isSdxlPreset(modelPreset, resolvedAir)
            ? 28
            : isKleinPreset(modelPreset, resolvedAir)
                ? 8
                : isZImagePreset(modelPreset, resolvedAir)
                    ? 9
                    : clampNumber(input.steps, DEFAULT_GENERATION_SETTINGS.steps, 1, 60, true);
        const normalizedCfg = isSdxlPreset(modelPreset, resolvedAir)
            ? 5
            : isKleinPreset(modelPreset, resolvedAir)
                ? 1
                : isZImagePreset(modelPreset, resolvedAir)
                    ? 1
                    : clampNumber(input.cfgScale, DEFAULT_GENERATION_SETTINGS.cfgScale, 1, 15, false);
        return {
            modelPreset,
            modelAir: resolvedAir,
            width: normalizeDimension(input.width, DEFAULT_GENERATION_SETTINGS.width),
            height: normalizeDimension(input.height, DEFAULT_GENERATION_SETTINGS.height),
            steps: normalizedSteps,
            cfgScale: normalizedCfg,
            batch: clampNumber(input.batch, DEFAULT_GENERATION_SETTINGS.batch, 1, 4, true),
            seed: input.seed === null || input.seed === undefined ? null : clampNumber(input.seed, 0, 0, 2147483647, true),
            negativePromptExtra: String(input.negativePromptExtra || '').trim().slice(0, 1200),
            loras: []
        };
    }
}
