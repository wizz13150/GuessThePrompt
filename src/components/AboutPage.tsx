import type { AppHealth } from '../lib/api';

function providerName(mode?: string) {
  if (mode === 'civitai') return 'Civitai orchestrator';
  return 'Mock SVG diagnostics provider';
}

export function AboutPage({ health }: { health: AppHealth | null }) {
  return (
    <section className="tab-page">
      <div className="tab-hero-card">
        <div>
          <div className="eyebrow">About · Civitai app candidate</div>
          <h1>Guess The Prompt architecture</h1>
          <p>
            This build is a portable local version of the future Civitai app: hash-routed React interface, Hono backend-for-frontend,
            Civitai prompt provider, orchestrator generation provider, hint system, scoring engine, and persistent local leaderboard.
          </p>
        </div>
      </div>

      <div className="about-grid">
        <section className="panel">
          <div className="panel-title">What is functional now</div>
          <ul className="clean-list">
            <li>Play, Explore, Leaderboard, and About are routed views, not decorative buttons.</li>
            <li>Adventure mode imports Civitai prompts and uses them for fresh generated rounds.</li>
            <li>Mock mode remains available for offline diagnostics without any network dependency.</li>
            <li>Civitai Orchestrator mode stays isolated behind the server-side provider boundary.</li>
            <li>Leaderboard and scoring are persisted locally.</li>
          </ul>
        </section>
        <section className="panel">
          <div className="panel-title">Current backend status</div>
          <div className="info-list">
            <div><strong>Mode</strong><span>{health?.mode ?? 'unknown'}</span></div>
            <div><strong>Provider</strong><span>{providerName(health?.mode)}</span></div>
            <div><strong>API key</strong><span>{health?.civitai.apiKeyConfigured ? 'configured' : 'missing'}</span></div>
                        <div><strong>Prompt cache</strong><span>{health?.promptCache.total ?? 0} prompts</span></div>
            <div><strong>Uptime</strong><span>{health?.uptime ?? 0}s</span></div>
          </div>
        </section>
        <section className="panel wide-panel">
          <div className="panel-title">Final Civitai integration path</div>
          <div className="flow-steps">
            <div><strong>1</strong><span>Configure a new local Civitai API key for live generation</span></div>
            <div><strong>2</strong><span>Create Civitai OAuth App for hosted submission</span></div>
            <div><strong>3</strong><span>Store OAuth tokens in the BFF session</span></div>
            <div><strong>4</strong><span>Automatically estimate Buzz cost from the current generation settings</span></div>
            <div><strong>5</strong><span>Submit workflow and poll result</span></div>
          </div>
        </section>
      </div>
    </section>
  );
}
