import { useEffect, useMemo, useRef, useState } from 'react';
import { api, clearCivitaiCredentials, getStoredCivitaiCredentials, saveCivitaiCredentials, type AppHealth, type Estimate, type GenerationModelPreset, type GenerationSettings, type LeaderboardPayload, type PromptCacheStats, type PromptPreview, type PromptSyncResult, type PublicDemoCredentials, type SafeRound, type UserInfo } from './lib/api';
import { Header, type AppTab } from './components/Header';
import { GameControls } from './components/GameControls';
import { GameBoard } from './components/GameBoard';
import { SidePanel } from './components/SidePanel';
import { ExplorePanel } from './components/ExplorePanel';
import { LeaderboardPage } from './components/LeaderboardPage';
import { AboutPage } from './components/AboutPage';
import { ConfigPanel } from './components/ConfigPanel';

function tabFromHash(): AppTab {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  return hash === 'explore' || hash === 'config' || hash === 'leaderboard' || hash === 'about' ? hash : 'play';
}

function stageFromRound(round: SafeRound | null) {
  if (!round) return 'ready-to-start';
  if (round.solved || round.gaveUp) return 'round-complete';
  if (!round.imageUrl) return 'round-ready';
  return 'guessing';
}


function PublicDemoAuthPanel({
  credentials,
  health,
  loading,
  onConnect,
  onForget
}: {
  credentials: PublicDemoCredentials;
  health: AppHealth | null;
  loading: boolean;
  onConnect: (credentials: PublicDemoCredentials) => void;
  onForget: () => void;
}) {
  const [username, setUsername] = useState(credentials.username || 'Guest');
  const [apiKey, setApiKey] = useState(credentials.apiKey || '');

  useEffect(() => {
    setUsername(credentials.username || 'Guest');
    setApiKey(credentials.apiKey || '');
  }, [credentials.username, credentials.apiKey]);

  const liveMode = (health?.mode ?? 'civitai') === 'civitai';
  const connected = Boolean(credentials.apiKey);

  return (
    <section className="panel public-demo-auth-panel">
      <div className="public-demo-auth-head">
        <div>
          <div className="panel-title">Public demo session</div>
          <h3>Connect your own Civitai account</h3>
          <p>Enter only the information needed for this demo: a display name and your Civitai API Key. The key is kept in this browser tab session and sent only with API requests that need Civitai access.</p>
        </div>
        <span className={connected || !liveMode ? 'soft-chip success-chip' : 'soft-chip warning-chip'}>
          {liveMode ? (connected ? 'Civitai key ready' : 'Civitai key required') : 'Mock mode'}
        </span>
      </div>
      <div className="public-demo-auth-grid">
        <label>
          Civitai username / player name
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Guest" autoComplete="username" />
        </label>
        <label>
          Civitai API Key
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your Civitai API Key" type="password" autoComplete="off" />
        </label>
        <div className="public-demo-auth-actions">
          <button type="button" className="primary" disabled={loading || (liveMode && apiKey.trim().length < 20)} onClick={() => onConnect({ username, apiKey })}>
            {connected ? 'Update session' : 'Connect for this session'}
          </button>
          <button type="button" disabled={loading || !connected} onClick={onForget}>Forget key</button>
        </div>
      </div>
      <small className="public-demo-auth-note">For a developer demo, debug routes stay available. API keys are never bundled in this build and are not written to server logs.</small>
    </section>
  );
}

function DebugConsole({ logs, busyAction, onRefresh }: { logs: string[]; busyAction: string; onRefresh: () => void }) {
  return (
    <section className="panel debug-console-panel compact-debug-panel">
      <div className="debug-console-head">
        <div>
          <div className="panel-title">Debug console</div>
          <h3>Live server logs</h3>
        </div>
        <div className="debug-actions">
          {busyAction && <span className="debug-busy">{busyAction}</span>}
          <button type="button" className="small-button" onClick={onRefresh}>Refresh logs</button>
        </div>
      </div>
      <pre>{logs.length ? logs.slice(-80).join('\n') : 'No server log yet. Start a game, estimate, or generate to populate this console.'}</pre>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(() => tabFromHash());
  const [health, setHealth] = useState<AppHealth | null>(null);
  const [me, setMe] = useState<UserInfo | null>(null);
  const [round, setRound] = useState<SafeRound | null>(null);
  const [pendingRound, setPendingRound] = useState<SafeRound | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<SafeRound | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [roundNumber, setRoundNumber] = useState(0);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [pendingEstimate, setPendingEstimate] = useState<Estimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [pendingEstimateLoading, setPendingEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState('');
  const [pendingEstimateError, setPendingEstimateError] = useState('');
  const [mode, setMode] = useState<SafeRound['mode']>('adventure');
  const [difficulty, setDifficulty] = useState<SafeRound['difficulty']>('normal');
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings | null>(null);
  const [modelPresets, setModelPresets] = useState<GenerationModelPreset[]>([]);
  const [prompts, setPrompts] = useState<PromptPreview[]>([]);
  const [promptStats, setPromptStats] = useState<PromptCacheStats | null>(null);
  const [syncResult, setSyncResult] = useState<PromptSyncResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [civitaiCredentials, setCivitaiCredentials] = useState<PublicDemoCredentials>(() => getStoredCivitaiCredentials());
  const autoNextTimer = useRef<number | null>(null);

  const gameStage = useMemo(() => stageFromRound(round), [round]);
  const liveCivitaiMode = (health?.mode ?? 'civitai') === 'civitai';
  const civitaiSessionReady = !liveCivitaiMode || Boolean(civitaiCredentials.apiKey);
  const providerBlockMessage = liveCivitaiMode && !civitaiCredentials.apiKey ? 'Enter your Civitai API Key in the public demo session panel first.' : '';

  async function refreshLogs() {
    const payload = await api.debugLogs(180);
    setDebugLogs(payload.logs);
  }

  async function refreshSystemState() {
    const [healthPayload, mePayload, cachePayload, leaderboardPayload, logsPayload, settingsPayload] = await Promise.all([
      api.health(),
      api.me(),
      api.cachePreview(),
      api.leaderboard(),
      api.debugLogs(120),
      api.generationSettings()
    ]);
    setHealth(healthPayload);
    setMe(mePayload);
    setPrompts(cachePayload.prompts);
    setPromptStats(cachePayload.stats);
    setLeaderboard(leaderboardPayload.leaderboard);
    setDebugLogs(logsPayload.logs);
    setGenerationSettings(settingsPayload.settings);
    setModelPresets(settingsPayload.presets);
  }



  async function connectPublicDemoSession(credentials: PublicDemoCredentials) {
    const saved = saveCivitaiCredentials(credentials);
    setCivitaiCredentials(saved);
    await run('connect public demo Civitai session', () => api.login(saved), () => undefined);
    await refreshSystemState().catch((error) => setNotice(error instanceof Error ? error.message : 'Session refresh failed'));
  }

  async function forgetPublicDemoSession() {
    const cleared = clearCivitaiCredentials();
    setCivitaiCredentials(cleared);
    stopGame();
    await refreshSystemState().catch((error) => setNotice(error instanceof Error ? error.message : 'Session refresh failed'));
  }


  useEffect(() => {
    refreshSystemState().catch((error) => setNotice(error instanceof Error ? error.message : 'Startup check failed'));
    const onHashChange = () => setActiveTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  async function run<T>(label: string, action: () => Promise<T>, after?: (result: T) => void) {
    setLoading(true);
    setBusyAction(label);
    setNotice('');
    console.info(`[Guess The Prompt UI] ${label} started`);
    try {
      const result = await action();
      after?.(result);
      console.info(`[Guess The Prompt UI] ${label} finished`, result);
      await refreshLogs().catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setNotice(message);
      console.error(`[Guess The Prompt UI] ${label} failed`, error);
      await refreshLogs().catch(() => undefined);
    } finally {
      setBusyAction('');
      setLoading(false);
    }
  }

  async function runQuiet<T>(label: string, action: () => Promise<T>, after?: (result: T) => void) {
    setBusyAction(label);
    setNotice('');
    try {
      const result = await action();
      after?.(result);
      await refreshLogs().catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setNotice(message);
      console.error(`[Guess The Prompt UI] ${label} failed`, error);
      await refreshLogs().catch(() => undefined);
    } finally {
      setBusyAction('');
    }
  }

  function applyRound(payload: { round: SafeRound }, incrementRoundNumber = false) {
    setRound(payload.round);
    setPendingRound(null);
    setEstimate(null);
    setPendingEstimate(null);
    setPendingEstimateLoading(false);
    setEstimateError('');
    setPendingEstimateError('');
    if (incrementRoundNumber) setRoundNumber((value) => value + 1);
    setActiveTab('play');
    window.location.hash = 'play';
    api.cachePreview().then((cachePayload) => {
      setPrompts(cachePayload.prompts);
      setPromptStats(cachePayload.stats);
    }).catch(() => undefined);
  }

  function updateRoundAndLeaderboard(payload: { round: SafeRound; leaderboard: LeaderboardPayload }) {
    setRound(payload.round);
    setLeaderboard(payload.leaderboard);
    if (payload.round.solved || payload.round.gaveUp) setLastRoundResult(payload.round);
  }

  function handleModeChange(nextMode: SafeRound['mode']) {
    setMode(nextMode);
    setEstimate(null);
    setPendingRound(null);
    setPendingEstimate(null);
    setPendingEstimateLoading(false);
    setEstimateError('');
    setPendingEstimateError('');
    console.info('[Guess The Prompt UI] Mode changed', nextMode);
  }

  function handleDifficultyChange(nextDifficulty: SafeRound['difficulty']) {
    setDifficulty(nextDifficulty);
    setEstimate(null);
    setPendingRound(null);
    setPendingEstimate(null);
    setPendingEstimateLoading(false);
    setEstimateError('');
    setPendingEstimateError('');
    console.info('[Guess The Prompt UI] Difficulty changed', nextDifficulty);
  }

  async function startRoundOnly() {
    return api.newRound(mode, difficulty);
  }

  async function startGame() {
    setGameActive(true);
    return startRoundOnly();
  }

  function stopGame() {
    if (autoNextTimer.current) window.clearTimeout(autoNextTimer.current);
    autoNextTimer.current = null;
    setGameActive(false);
    setRound(null);
    setPendingRound(null);
    setEstimate(null);
    setPendingEstimate(null);
    setPendingEstimateLoading(false);
    setEstimateError('');
    setPendingEstimateError('');
  }

  async function estimateRound(roundId: string, target: 'current' | 'pending') {
    if (target === 'current') {
      setEstimateLoading(true);
      setEstimateError('');
    } else {
      setPendingEstimateLoading(true);
      setPendingEstimateError('');
    }
    try {
      const payload = await api.estimate(roundId);
      if (target === 'current') setEstimate(payload.estimate);
      else setPendingEstimate(payload.estimate);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Automatic estimate failed';
      if (target === 'current') {
        setEstimate(null);
        setEstimateError(message);
      } else {
        setPendingEstimate(null);
        setPendingEstimateError(message);
      }
    } finally {
      if (target === 'current') setEstimateLoading(false);
      else setPendingEstimateLoading(false);
    }
  }

  async function estimateCurrentRound() {
    if (!round || round.solved || round.gaveUp || round.imageUrl) return;
    return estimateRound(round.id, 'current');
  }

  async function preparePendingRound() {
    const payload = await startRoundOnly();
    setPendingRound(payload.round);
    setPendingEstimate(null);
    setPendingEstimateError('');
    estimateRound(payload.round.id, 'pending').catch(() => undefined);
    return payload.round;
  }

  async function generateCurrentRound() {
    if (!gameActive) throw new Error('Start the game before generating the image.');
    if (!civitaiSessionReady) throw new Error(providerBlockMessage || 'Civitai session is not ready.');

    if (round && (round.solved || round.gaveUp)) {
      const previousResult = round;
      const nextRound = pendingRound ?? await preparePendingRound();
      setLastRoundResult(previousResult);
      setRound(nextRound);
      setEstimate(pendingEstimate);
      setEstimateError(pendingEstimateError);
      setPendingRound(null);
      setPendingEstimate(null);
      setPendingEstimateLoading(false);
      setPendingEstimateError('');
      setRoundNumber((value) => value + 1);
      const generated = await api.generate(nextRound.id);
      return generated;
    }

    if (!round) throw new Error('Start the game before generating the image.');
    if (round.imageUrl) throw new Error('This image is already generated. Guess the answer to continue.');
    return api.generate(round.id);
  }



  async function rerollCurrentRound() {
    if (!gameActive || !round) throw new Error('No active round to reroll.');
    if (!civitaiSessionReady) throw new Error(providerBlockMessage || 'Civitai session is not ready.');
    const payload = await api.reroll(round.id);
    setLastRoundResult(null);
    setEstimate(null);
    setPendingRound(null);
    setPendingEstimate(null);
    setPendingEstimateLoading(false);
    setEstimateError('');
    setPendingEstimateError('');
    return payload;
  }


  useEffect(() => {
    if (!round || round.imageUrl || round.solved || round.gaveUp || !gameActive || !civitaiSessionReady) return;
    const timer = window.setTimeout(() => {
      estimateCurrentRound().catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [round?.id, round?.imageUrl, round?.solved, round?.gaveUp, gameActive, generationSettings?.modelAir, generationSettings?.width, generationSettings?.height, generationSettings?.steps, generationSettings?.cfgScale, generationSettings?.batch, generationSettings?.seed, generationSettings?.negativePromptExtra, JSON.stringify(generationSettings?.loras ?? [])]);

  useEffect(() => {
    if (!gameActive || !round || !(round.solved || round.gaveUp) || pendingRound) return;
    if (autoNextTimer.current) window.clearTimeout(autoNextTimer.current);
    autoNextTimer.current = window.setTimeout(() => {
      runQuiet('prepare next round estimate', async () => ({ round: await preparePendingRound() }));
    }, 650);
    return () => {
      if (autoNextTimer.current) window.clearTimeout(autoNextTimer.current);
    };
  }, [gameActive, round?.id, round?.solved, round?.gaveUp, pendingRound?.id, mode, difficulty]);

  const playView = (
    <>
      <section className="hero-card compact-hero mini-hero">
        <div className="hero-copy">
          <div className="eyebrow">Civitai app prototype · prompt guessing game</div>
          <h1>Guess The Prompt</h1>
          <p>
            Start the game once, generate each mystery image, then keep guessing. After a solved or abandoned round, the next challenge is prepared in the background while the current image stays visible.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => run('start game', startGame, (payload) => applyRound(payload, true))} disabled={loading || gameActive || !civitaiSessionReady}>Start game</button>
            {gameActive && <button type="button" onClick={stopGame} disabled={loading}>Stop game</button>}
            <span className="soft-chip">{health?.mode === 'civitai' ? 'Civitai orchestrator · live generation' : 'Mock diagnostics · no Buzz spent'}</span>
          </div>
        </div>
        <div className="score-hero-card compact-score-card" aria-label="Session summary">
          <span>Session score</span>
          <strong>{leaderboard?.summary.totalScore ?? 0}</strong>
          <div className="mini-stat-row">
            <small>Best {leaderboard?.summary.bestScore ?? 0}</small>
            <small>Streak ×{leaderboard?.summary.currentStreak ?? 0}</small>
            <small>Solved {leaderboard?.summary.solvedRounds ?? 0}</small>
          </div>
        </div>
      </section>

      <PublicDemoAuthPanel credentials={civitaiCredentials} health={health} loading={loading} onConnect={connectPublicDemoSession} onForget={forgetPublicDemoSession} />

      <div className="status-strip scoring-strip compact-status-strip">
        <span>Flow: <strong>Start game → Generate image → Guess → Generate next image</strong></span>
        <span>Cost: <strong>estimated automatically from generation settings</strong></span>
        <span>Settings: <strong>Config tab controls model, batch and parameters</strong></span>
      </div>

      <div className="layout-grid compact-layout-grid">
        <GameControls
          mode={mode}
          difficulty={difficulty}
          loading={loading}
          busyAction={busyAction}
          estimate={gameStage === 'round-complete' ? pendingEstimate : estimate}
          estimateLoading={gameStage === 'round-complete' ? pendingEstimateLoading : estimateLoading}
          estimateError={gameStage === 'round-complete' ? pendingEstimateError : estimateError}
          round={round}
          pendingRound={pendingRound}
          roundNumber={roundNumber}
          stage={gameStage}
          gameActive={gameActive}
          generationSettings={generationSettings}
          providerMode={health?.mode ?? 'mock'}
          onMode={handleModeChange}
          onDifficulty={handleDifficultyChange}
          onStartGame={() => run('start game', startGame, (payload) => applyRound(payload, true))}
          onStopGame={stopGame}
          onGenerate={() => run('generate Civitai image', generateCurrentRound, (payload) => setRound(payload.round))}
          providerReady={civitaiSessionReady}
          providerBlockMessage={providerBlockMessage}
        />
        <GameBoard
          round={round}
          roundNumber={roundNumber}
          loading={loading}
          busyAction={busyAction}
          gameActive={gameActive}
          onGuess={(guess) => round ? run('submit guess', () => api.guess(round.id, guess), updateRoundAndLeaderboard) : undefined}
          onHint={() => round && run('unlock hint', () => api.hint(round.id), (payload) => setRound(payload.round))}
          onGiveUp={() => round && run('give up', () => api.giveUp(round.id), updateRoundAndLeaderboard)}
        />
        <SidePanel
          round={round}
          resultRound={(round?.solved || round?.gaveUp) ? round : lastRoundResult}
          prompts={prompts}
          leaderboard={leaderboard}
          loading={loading}
          onResetLeaderboard={() => run('reset leaderboard', () => api.resetLeaderboard(), (payload) => setLeaderboard(payload.leaderboard))}
          onRerollRound={() => run('reroll this round', rerollCurrentRound, (payload) => setRound(payload.round))}
          onNextRound={() => run('generate next Civitai image', generateCurrentRound, (payload) => setRound(payload.round))}
        />
      </div>

      <DebugConsole logs={debugLogs} busyAction={busyAction} onRefresh={() => run('refresh logs', () => api.debugLogs(180), (payload) => setDebugLogs(payload.logs))} />
    </>
  );

  return (
    <main className="app-shell">
      <Header me={me} activeTab={activeTab} onTab={setActiveTab} />
      {notice && <div className="notice"><strong>Action failed</strong><span>{notice}</span></div>}
      {activeTab === 'play' && playView}
      {activeTab === 'explore' && (
        <ExplorePanel
          health={health}
          prompts={prompts}
          stats={promptStats}
          loading={loading}
          syncResult={syncResult}
          onSync={() => run('sync Civitai prompts', () => api.syncCivitaiPrompts(300), (payload) => {
            setSyncResult(payload);
            setPrompts(payload.prompts);
            setPromptStats({
              total: payload.cache.totalCache,
              live: payload.cache.retainedLiveCache,
              samples: payload.cache.totalCache - payload.cache.retainedLiveCache,
              bestQuality: payload.prompts[0]?.qualityScore ?? 0,
              cachePath: promptStats?.cachePath ?? ''
            });
            api.health().then(setHealth).catch(() => undefined);
          })}
        />
      )}
      {activeTab === 'config' && <ConfigPanel settings={generationSettings} presets={modelPresets} loading={loading} onSave={(settings) => run('save generation settings', () => api.updateGenerationSettings(settings), (payload) => {
        setGenerationSettings(payload.settings);
        setModelPresets(payload.presets);
        setPendingRound(null);
        setPendingEstimate(null);
        setEstimate(null);
        setEstimateError('');
        setPendingEstimateError('');
      })} />}
      {activeTab === 'leaderboard' && <LeaderboardPage leaderboard={leaderboard} loading={loading} onReset={() => run('reset leaderboard', () => api.resetLeaderboard(), (payload) => setLeaderboard(payload.leaderboard))} />}
      {activeTab === 'about' && <AboutPage health={health} />}
    </main>
  );
}
