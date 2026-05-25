import type { UserInfo } from '../lib/api';

export type AppTab = 'play' | 'explore' | 'config' | 'leaderboard' | 'about';

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: 'play', label: 'Play' },
  { id: 'explore', label: 'Explore' },
  { id: 'config', label: 'Config' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'about', label: 'About' }
];

function modeLabel(mode?: string) {
  if (mode === 'civitai') return 'Civitai orchestrator';
  return `${mode ? 'Mock diagnostics' : 'Loading'}${mode ? '' : ''}`;
}

export function Header({ me, activeTab, onTab }: { me: UserInfo | null; activeTab: AppTab; onTab: (tab: AppTab) => void }) {
  function activate(tab: AppTab) {
    window.location.hash = tab;
    onTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <header className="topbar">
      <button type="button" className="brand-lockup brand-button" onClick={() => activate('play')} aria-label="Open Play tab">
        <div className="brand-mark">G</div>
        <div>
          <strong>Guess The Prompt</strong>
          <small>Civitai generation minigame · v1.9 public demo</small>
        </div>
      </button>
      <nav className="app-nav" aria-label="Application navigation">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => activate(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="user-pill">
        <span className="status-dot" />
        <div>
          <strong>{me?.user.username ?? 'Loading user'}</strong>
          <small>{me ? modeLabel(me.mode) : 'Loading provider'}</small>
        </div>
      </div>
    </header>
  );
}
