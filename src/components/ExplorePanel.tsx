import type { AppHealth, PromptCacheStats, PromptPreview, PromptSyncResult } from '../lib/api';

function providerName(mode?: string) {
  if (mode === 'civitai') return 'Civitai orchestrator';
  return 'Mock diagnostics provider';
}

export function ExplorePanel({
  health,
  prompts,
  stats,
  loading,
  syncResult,
  onSync
}: {
  health: AppHealth | null;
  prompts: PromptPreview[];
  stats: PromptCacheStats | null;
  loading: boolean;
  syncResult: PromptSyncResult | null;
  onSync: () => void;
}) {
  const livePrompts = prompts.filter((prompt) => prompt.source === 'civitai-live-cache');
  const samplePrompts = prompts.filter((prompt) => prompt.source !== 'civitai-live-cache');
  const visiblePrompts = livePrompts.length ? livePrompts : samplePrompts;

  return (
    <section className="tab-page">
      <div className="tab-hero-card">
        <div>
          <div className="eyebrow">Explore · Civitai prompt provider</div>
          <h1>Prompt cache and provider status</h1>
          <p>
            Adventure mode uses Civitai prompt metadata instead of Lexica. The prompt cache provides richer hidden answers, then the Play tab generates a fresh image through the Civitai orchestrator when a server-side API key is configured.
          </p>
        </div>
        <div className="provider-status-card">
          <span>Generation provider</span>
          <strong>{providerName(health?.mode)}</strong>
          <small>{health?.mode === 'civitai' ? (health?.civitai.apiKeyConfigured ? 'API key configured server-side' : 'API key missing') : 'Local SVG diagnostics only'}</small>
        </div>
      </div>

      <div className="explore-grid">
        <section className="panel wide-panel">
          <div className="leaderboard-heading">
            <div>
              <div className="panel-title">Civitai live cache</div>
              <h2>Import Civitai prompts</h2>
            </div>
            <button type="button" className="primary" onClick={onSync} disabled={loading}>Sync Civitai prompts</button>
          </div>
          <p className="muted">
            The importer reads public Civitai image metadata, keeps safe prompts only, derives a playable hidden answer, and prioritizes these entries in Adventure mode. Images are still generated fresh during gameplay.
          </p>
          <div className="summary-grid explore-summary">
            <div><span>Total cache</span><strong>{stats?.total ?? 0}</strong></div>
            <div><span>Live Civitai</span><strong>{stats?.live ?? 0}</strong></div>
            <div><span>Samples</span><strong>{stats?.samples ?? 0}</strong></div>
            <div><span>Best quality</span><strong>{stats?.bestQuality ?? 0}</strong></div>
          </div>
          {syncResult && (
            <div className="success-card">
              <strong>Sync completed</strong>
              <span>{syncResult.scanned} scanned · {syncResult.cache.imported} imported after safety and duplicate filtering · {syncResult.skipped} skipped · {syncResult.cache.retainedLiveCache} live prompts retained · {syncResult.cache.totalCache} total cached prompts</span>
            </div>
          )}
          <div className="cache-table">
            {visiblePrompts.slice(0, 12).map((prompt) => (
              <article className="prompt-row" key={prompt.id}>
                <div>
                  <strong>{prompt.title}</strong>
                  <small>{prompt.source} · hidden answer kept secret · quality {prompt.qualityScore}</small>
                </div>
                <div className="tags compact-tags">
                  {prompt.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Provider modes</div>
          <h3>Current mode: {providerName(health?.mode)}</h3>
          <p className="muted">
            Use Civitai Orchestrator mode for real image generation. Configure a new API key locally; the key stays server-side in .env and is not sent to React.
          </p>
          <div className="info-list">
            <div><strong>APP_MODE</strong><span>{health?.mode ?? 'unknown'}</span></div>
            <div><strong>API key</strong><span>{health?.civitai.apiKeyConfigured ? 'configured' : 'missing'}</span></div>
                        <div><strong>Model AIR</strong><span>{health?.civitai.modelAir ?? 'not loaded'}</span></div>
          </div>
        </section>
      </div>
    </section>
  );
}
