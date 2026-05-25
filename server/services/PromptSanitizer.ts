const BLOCKED_WORDS = [
  'nsfw',
  'nude',
  'naked',
  'sex',
  'explicit',
  'porn',
  'gore',
  'bloodbath'
];

export function sanitizePrompt(raw: string): string {
  return raw
    .replace(/<lora:[^>]+>/gi, '')
    .replace(/\b(seed|steps|sampler|cfg scale|model hash)\b\s*[:=]\s*[^,]+/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/,+/g, ',')
    .trim();
}

export function isPromptSafe(raw: string): boolean {
  const lower = raw.toLowerCase();
  return !BLOCKED_WORDS.some((word) => lower.includes(word));
}
