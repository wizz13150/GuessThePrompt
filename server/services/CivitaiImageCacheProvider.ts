import type { Difficulty, EstimateResult, GenerationProvider, GenerationSettings, PromptRecord } from './types.js';

export class CivitaiImageCacheProvider implements GenerationProvider {
  async estimate(record: PromptRecord, _difficulty: Difficulty, settings: GenerationSettings): Promise<EstimateResult> {
    return {
      buzzCost: 0,
      provider: 'civitai-images',
      width: settings.width,
      height: settings.height,
      steps: settings.steps,
      batch: settings.batch,
      cfgScale: settings.modelPreset === 'flux2-klein-9b' || settings.modelAir.startsWith('urn:air:flux2:') ? null : settings.cfgScale,
      modelAir: settings.modelAir,
      modelHint: record.sourceImageUrl
        ? `${record.modelHint} · public Civitai image cache`
        : `${record.modelHint} · local fallback required`
    };
  }

  async generate(record: PromptRecord, difficulty: Difficulty, _settings: GenerationSettings): Promise<{ imageUrl: string; imageUrls: string[]; provider: string; workflowId: string }> {
    if (!record.sourceImageUrl) {
      throw new Error('This round has no Civitai source image. Open Explore and run Sync Civitai prompts, or start another Adventure round.');
    }

    return {
      imageUrl: record.sourceImageUrl,
      imageUrls: [record.sourceImageUrl],
      provider: 'civitai-images',
      workflowId: `civitai-image-cache-${record.id}-${difficulty}`
    };
  }
}
