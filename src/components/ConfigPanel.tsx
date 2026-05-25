import { FormEvent, useEffect, useState } from 'react';
import type { GenerationModelPreset, GenerationSettings } from '../lib/api';

const DIMENSIONS = [512, 640, 768, 832, 896, 1024, 1152, 1216, 1344];

function fixedStepsForPreset(presetId: GenerationSettings['modelPreset']): number | null {
  if (presetId === 'sdxl-base') return 28;
  if (presetId === 'flux2-klein-9b') return 8;
  if (presetId === 'z-image-turbo') return 9;
  return null;
}

function fixedCfgForPreset(presetId: GenerationSettings['modelPreset']): number | null | undefined {
  if (presetId === 'sdxl-base') return 5;
  if (presetId === 'flux2-klein-9b') return null;
  if (presetId === 'z-image-turbo') return 1;
  return undefined;
}

function applyPresetDefaults(settings: GenerationSettings, presetId: GenerationSettings['modelPreset'], air: string): GenerationSettings {
  const fixedSteps = fixedStepsForPreset(presetId);
  const fixedCfg = fixedCfgForPreset(presetId);
  return {
    ...settings,
    modelPreset: presetId,
    modelAir: air,
    steps: fixedSteps ?? settings.steps,
    cfgScale: fixedCfg === null ? 1 : fixedCfg ?? settings.cfgScale,
    loras: []
  };
}

export function ConfigPanel({
  settings,
  presets,
  loading,
  onSave
}: {
  settings: GenerationSettings | null;
  presets: GenerationModelPreset[];
  loading: boolean;
  onSave: (settings: GenerationSettings) => void;
}) {
  const [draft, setDraft] = useState<GenerationSettings | null>(settings);

  useEffect(() => {
    if (settings) setDraft({ ...settings, loras: [] });
  }, [settings]);

  if (!draft) {
    return <section className="tab-page"><div className="panel">Loading generation settings…</div></section>;
  }

  function update<K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    onSave({ ...draft, loras: [] });
  }

  const activePreset = presets.find((preset) => preset.id === draft.modelPreset);
  const stepsLocked = draft.modelPreset === 'sdxl-base' || draft.modelPreset === 'flux2-klein-9b' || draft.modelPreset === 'z-image-turbo';
  const cfgDisabled = draft.modelPreset === 'flux2-klein-9b';
  const cfgLocked = draft.modelPreset === 'sdxl-base' || draft.modelPreset === 'z-image-turbo';
  const negativePromptDisabled = draft.modelPreset !== 'sdxl-base' && !draft.modelAir.startsWith('urn:air:sdxl:');

  return (
    <section className="tab-page config-page">
      <div className="tab-hero-card compact-tab-hero">
        <div>
          <div className="eyebrow">Config · generation controls</div>
          <h1>Generation settings</h1>
          <p>Choose the model used for the game, tune image parameters, set batch size, and keep the round Buzz estimate aligned with the current setup.</p>
        </div>
      </div>

      <form className="config-grid" onSubmit={submit}>
        <section className="panel config-panel-card">
          <div className="panel-title">Model</div>
          <label>
            Model preset
            <select value={draft.modelPreset} onChange={(event) => {
              const presetId = event.target.value as GenerationSettings['modelPreset'];
              const preset = presets.find((item) => item.id === presetId);
              setDraft(applyPresetDefaults(draft, presetId, preset?.air || draft.modelAir));
            }}>
              {presets.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}
            </select>
          </label>
          <p className="field-help">{activePreset?.description}</p>
          <label>
            Checkpoint AIR URN
            <input value={draft.modelAir} onChange={(event) => update('modelAir', event.target.value)} disabled={draft.modelPreset !== 'custom-air'} placeholder="urn:air:sdxl:checkpoint:civitai:...@..." />
          </label>
          <p className="field-help">Default model: SDXL. Flux.2 Klein and Z-Image are kept as experimental presets because Civitai may return failed workflows for these AIR routes even when the model appears in Generator.</p>
        </section>

        <section className="panel config-panel-card">
          <div className="panel-title">Image parameters</div>
          <div className="two-col-fields">
            <label>Width<select value={draft.width} onChange={(event) => update('width', Number(event.target.value))}>{DIMENSIONS.map((value) => <option key={value} value={value}>{value}px</option>)}</select></label>
            <label>Height<select value={draft.height} onChange={(event) => update('height', Number(event.target.value))}>{DIMENSIONS.map((value) => <option key={value} value={value}>{value}px</option>)}</select></label>
            <label>Steps<input type="number" min="1" max="60" value={draft.steps} disabled={stepsLocked} onChange={(event) => update('steps', Number(event.target.value))} /></label>
            <label>CFG scale<input type="number" min="1" max="15" step="0.1" value={draft.cfgScale} disabled={cfgDisabled || cfgLocked} onChange={(event) => update('cfgScale', Number(event.target.value))} /></label>
            <label>Batch<select value={draft.batch} onChange={(event) => update('batch', Number(event.target.value))}>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} image{value > 1 ? 's' : ''}</option>)}</select></label>
            <label>Seed<input type="number" min="0" value={draft.seed ?? ''} onChange={(event) => update('seed', event.target.value === '' ? null : Number(event.target.value))} placeholder="Random" /></label>
          </div>
          <p className="field-help">SDXL uses 28 steps with CFG 5. Flux.2 Klein uses 8 steps with CFG disabled. Z-Image Turbo uses 9 steps with CFG 1. Batch is capped at 4. Save settings to refresh the automatic Buzz estimate for the prepared round.</p>
        </section>

        <section className="panel config-panel-card wide-config-card paused-feature-card">
          <div className="panel-title">LoRA resources</div>
          <h3>Temporarily paused</h3>
          <p className="field-help">LoRA configuration is intentionally disabled for now. The server still forces an empty LoRA list so Civitai generation stays predictable while model selection and core gameplay are stabilized.</p>
        </section>

        <section className="panel config-panel-card wide-config-card">
          <div className="panel-title">Negative prompt additions</div>
          <textarea value={negativePromptDisabled ? '' : draft.negativePromptExtra} disabled={negativePromptDisabled} onChange={(event) => update('negativePromptExtra', event.target.value)} placeholder={negativePromptDisabled ? 'Negative prompt is disabled for this model family.' : 'Extra negative prompt terms…'} />
          <div className="config-actions">
            <button type="submit" className="primary" disabled={loading}>Save generation settings</button>
            <span className="muted">Settings are stored locally on the server and used by the next estimate/generation. Negative prompt is only sent for SDXL.</span>
          </div>
        </section>
      </form>
    </section>
  );
}
