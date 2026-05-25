import type { Difficulty, EstimateResult, GenerationProvider, GenerationSettings, PromptRecord, RequestContext } from './types.js';

function escapeXml(input: string): string {
  return input.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char] ?? char);
}

function stableHue(input: string): number {
  let hash = 0;
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export class MockGenerationProvider implements GenerationProvider {
  async estimate(record: PromptRecord, difficulty: Difficulty, settings: GenerationSettings, context?: RequestContext): Promise<EstimateResult> {
    void context;
    const base = difficulty === 'hard' ? 8 : difficulty === 'easy' ? 3 : 5;
    const sizeFactor = Math.max(1, (settings.width * settings.height) / (1024 * 1024));
    const stepFactor = Math.max(1, settings.steps / 28);
    return {
      buzzCost: Math.ceil(base * sizeFactor * stepFactor * settings.batch),
      provider: 'mock',
      width: settings.width,
      height: settings.height,
      steps: settings.steps,
      batch: settings.batch,
      cfgScale: settings.modelPreset === 'flux2-klein-9b' || settings.modelAir.startsWith('urn:air:flux2:') ? null : settings.cfgScale,
      modelHint: `${record.modelHint} · ${settings.modelAir}`,
      modelAir: settings.modelAir
    };
  }

  async generate(record: PromptRecord, difficulty: Difficulty, settings: GenerationSettings, context?: RequestContext): Promise<{ imageUrl: string; imageUrls: string[]; provider: string; workflowId: string }> {
    void context;
    const hue = stableHue(record.prompt + difficulty + settings.modelAir + settings.batch);
    const accent = (hue + 65) % 360;
    const muted = (hue + 190) % 360;
    const safeTitle = escapeXml(record.title);
    const safeTags = escapeXml(record.tags.slice(0, 3).join(' • '));
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
        <defs>
          <radialGradient id="g" cx="32%" cy="22%" r="85%">
            <stop offset="0%" stop-color="hsl(${accent}, 92%, 66%)"/>
            <stop offset="45%" stop-color="hsl(${hue}, 70%, 35%)"/>
            <stop offset="100%" stop-color="hsl(${muted}, 65%, 12%)"/>
          </radialGradient>
          <filter id="grain"><feTurbulence baseFrequency="0.72" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .16"/></feComponentTransfer></filter>
        </defs>
        <rect width="1024" height="1024" fill="url(#g)"/>
        <rect width="1024" height="1024" filter="url(#grain)" opacity="0.32"/>
        <circle cx="760" cy="230" r="160" fill="rgba(255,255,255,.16)"/>
        <circle cx="270" cy="690" r="245" fill="rgba(255,255,255,.10)"/>
        <path d="M134 738 C 260 540, 413 880, 570 634 S 822 620, 930 356" fill="none" stroke="rgba(255,255,255,.36)" stroke-width="18" stroke-linecap="round"/>
        <g transform="translate(132 148)">
          <rect width="760" height="250" rx="42" fill="rgba(10,10,20,.44)" stroke="rgba(255,255,255,.26)"/>
          <text x="42" y="82" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="white">Mystery image generated</text>
          <text x="42" y="136" font-family="Inter, Arial, sans-serif" font-size="24" fill="rgba(255,255,255,.78)">${safeTitle}</text>
          <text x="42" y="190" font-family="Inter, Arial, sans-serif" font-size="20" fill="rgba(255,255,255,.62)">${safeTags}</text>
          <text x="42" y="224" font-family="Inter, Arial, sans-serif" font-size="18" fill="rgba(255,255,255,.50)">${settings.width}x${settings.height} · batch ${settings.batch} · ${settings.steps} steps</text>
        </g>
      </svg>`;

    const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return {
      imageUrl,
      imageUrls: Array.from({ length: Math.max(1, Math.min(settings.batch, 4)) }, () => imageUrl),
      provider: 'mock',
      workflowId: `mock-${Date.now().toString(36)}`
    };
  }
}
