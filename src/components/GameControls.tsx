import type { Estimate, GenerationSettings, SafeRound } from '../lib/api';

function stepClass(active: boolean, done: boolean) {
  return `flow-step-card${active ? ' active-step' : ''}${done ? ' done-step' : ''}`;
}

function providerLabel(providerMode: string) {
  if (providerMode === 'civitai') return 'Live Civitai generation';
  return 'Local mock generation';
}

function modeHelp(mode: SafeRound['mode']) {
  if (mode === 'classic') return 'Classic hides a simple target word. The generated image is based directly on that word.';
  return 'Adventure picks a richer prompt from the Civitai prompt pool. The answer is still a hidden keyword, but the image is more cinematic and less literal.';
}

function difficultyHelp(difficulty: SafeRound['difficulty']) {
  if (difficulty === 'easy') return 'Easy accepts looser guesses, has lighter penalties, and gives more time bonus room.';
  if (difficulty === 'hard') return 'Hard is stricter, rewards more points, and punishes extra attempts more strongly.';
  return 'Normal is the balanced ruleset for regular play.';
}

export function GameControls({
  mode,
  difficulty,
  loading,
  busyAction,
  estimate,
  estimateLoading,
  estimateError,
  round,
  pendingRound,
  roundNumber,
  stage,
  gameActive,
  generationSettings,
  onMode,
  onDifficulty,
  onStartGame,
  onStopGame,
  onGenerate,
  providerMode,
  providerReady,
  providerBlockMessage
}: {
  mode: SafeRound['mode'];
  difficulty: SafeRound['difficulty'];
  loading: boolean;
  busyAction: string;
  estimate: Estimate | null;
  estimateLoading: boolean;
  estimateError: string;
  round: SafeRound | null;
  pendingRound: SafeRound | null;
  roundNumber: number;
  stage: 'ready-to-start' | 'round-ready' | 'guessing' | 'round-complete';
  gameActive: boolean;
  generationSettings: GenerationSettings | null;
  providerMode: 'mock' | 'civitai-images' | 'civitai' | string;
  onMode: (mode: SafeRound['mode']) => void;
  onDifficulty: (difficulty: SafeRound['difficulty']) => void;
  onStartGame: () => void;
  onStopGame: () => void;
  onGenerate: () => void;
  providerReady: boolean;
  providerBlockMessage: string;
}) {
  const roundReady = stage === 'round-ready';
  const guessing = stage === 'guessing';
  const complete = stage === 'round-complete';
  const canStartGame = !loading && !gameActive && providerReady;
  const canGenerate = !loading && gameActive && providerReady && (roundReady || complete);
  const canChangeRules = !loading;
  const imageCount = generationSettings?.batch ?? 1;
  const imageWord = imageCount > 1 ? 'images' : 'image';
  const generationLabel = complete ? `Generate next ${imageWord}` : `Generate ${imageWord}`;
  const costLabel = complete ? 'Estimated next round cost' : 'Estimated round cost';

  return (
    <section className="panel controls-panel compact-panel">
      <div className="panel-heading compact-heading">
        <div>
          <div className="panel-title">Game controls</div>
          <h2>{gameActive ? `Game running · round ${roundNumber || 1}` : 'Ready to play'}</h2>
        </div>
      </div>

      <div className="settings-card compact-settings select-safe-zone">
        <label>
          Mode
          <select value={mode} onChange={(event) => onMode(event.target.value as SafeRound['mode'])} disabled={!canChangeRules}>
            <option value="adventure">Adventure</option>
            <option value="classic">Classic</option>
          </select>
        </label>
        <p className="field-help">{modeHelp(mode)}</p>

        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => onDifficulty(event.target.value as SafeRound['difficulty'])} disabled={!canChangeRules}>
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <p className="field-help">{difficultyHelp(difficulty)}</p>
        <small>Changes apply to the next prepared round. Current generated images keep their original rules.</small>
      </div>

      <div className="flow-action-stack slim-flow">
        <div className={stepClass(!gameActive, gameActive)}>
          <span>Step 1</span>
          <strong>Start game</strong>
          <button type="button" className="primary" onClick={onStartGame} disabled={!canStartGame}>Start game</button>
        </div>

        <div className={stepClass(roundReady || complete, guessing)}>
          <span>Step 2</span>
          <strong>{complete ? `Next ${imageWord}` : `Generate ${imageWord}`}</strong>
          <button type="button" className="primary" onClick={onGenerate} disabled={!canGenerate}>
            {loading && busyAction.toLowerCase().includes('generate') ? 'Generating…' : generationLabel}
          </button>
          {roundReady && <small>{providerReady ? 'Round is ready. Cost is estimated automatically below.' : providerBlockMessage}</small>}
          {complete && <small>{pendingRound ? 'Next round is already prepared. Your solved image stays visible until you generate the next one.' : 'Preparing the next round in the background.'}</small>}
        </div>

        <div className={stepClass(guessing, complete)}>
          <span>Step 3</span>
          <strong>Guess</strong>
          <small>{guessing ? 'Type guesses under the image. The input keeps focus after each try.' : complete ? 'Round solved. Generate the next image when ready.' : 'Available after generation.'}</small>
        </div>
      </div>

      <div className="cost-card always-cost-card">
        <span>{costLabel}</span>
        {estimateLoading ? <strong>Estimating…</strong> : estimate ? <strong>{estimate.buzzCost} Buzz</strong> : <strong>—</strong>}
        {estimate ? (
          <small>{estimate.provider} · {estimate.width}×{estimate.height} · batch {estimate.batch} · {estimate.steps} steps · {estimate.cfgScale === null ? 'CFG disabled' : `CFG ${estimate.cfgScale}`}</small>
        ) : estimateError ? (
          <small className="error-text">{estimateError}</small>
        ) : roundReady || complete ? (
          <small>Waiting for automatic Civitai cost preview.</small>
        ) : (
          <small>Start the game to prepare a round and calculate its cost.</small>
        )}
      </div>

      <div className="provider-card condensed-provider">
        <strong>{providerLabel(providerMode)}</strong>
        <span>{providerMode === 'civitai' ? 'Generation uses the visitor-supplied Civitai API Key for this session.' : 'Mock mode creates an offline diagnostic image only.'}</span>
        {!providerReady && <small className="error-text">{providerBlockMessage}</small>}
        {generationSettings && <small>Model: {generationSettings.modelAir} · batch {generationSettings.batch}/4</small>}
      </div>
    </section>
  );
}
