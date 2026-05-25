import { FormEvent, useEffect, useRef, useState } from 'react';
import type { SafeRound } from '../lib/api';

function HintPanel({ round, loading, onHint }: { round: SafeRound; loading: boolean; onHint: () => void }) {
  const availability = round.hintAvailability;
  const disabled = loading || !round.imageUrl || round.solved || round.gaveUp || !availability.available;

  return (
    <div className="hint-panel">
      <div className="hint-panel-head">
        <div>
          <strong>Hints</strong>
          <span>{availability.reason}</span>
        </div>
        <button type="button" onClick={onHint} disabled={disabled}>
          {availability.cost ? `Unlock hint · -${availability.cost} pts` : 'No more hints'}
        </button>
      </div>
      {round.hints.length > 0 && (
        <div className="hint-list">
          {round.hints.map((hint) => (
            <div className="hint-item" key={`${hint.level}-${hint.at}`}>
              <span>{hint.label} · -{hint.cost} pts</span>
              <strong>{hint.text}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GameBoard({
  round,
  roundNumber,
  loading,
  busyAction,
  gameActive,
  onGuess,
  onHint,
  onGiveUp
}: {
  round: SafeRound | null;
  roundNumber: number;
  loading: boolean;
  busyAction: string;
  gameActive: boolean;
  onGuess: (guess: string) => Promise<void> | void;
  onHint: () => void;
  onGiveUp: () => void;
}) {
  const [guess, setGuess] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const roundEnded = Boolean(round?.solved || round?.gaveUp);
  const canType = Boolean(round && !roundEnded && gameActive);
  const canGuess = Boolean(round?.imageUrl && !roundEnded && gameActive && !loading);

  useEffect(() => {
    if (canType) inputRef.current?.focus();
  }, [canType, canGuess, round?.id, round?.attempts.length, loading]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = guess.trim();
    if (!trimmed || !canGuess) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    setGuess('');
    await Promise.resolve(onGuess(trimmed));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <section className="panel board-panel compact-board">
      <div className="panel-heading board-heading compact-heading">
        <div>
          <div className="panel-title">Generated image{roundNumber ? ` · round ${roundNumber}` : ''}</div>
          <h2>Guess The Prompt</h2>
        </div>
        {round?.scoreBreakdown ? <span className="grade-badge">Grade {round.scoreBreakdown.grade}</span> : round && <span className="quality-badge">quality {round.promptQualityScore}</span>}
      </div>

      {!round && <div className="empty-state large-empty">Click Start game. The first round will be prepared, then you only click Generate image for each round.</div>}

      {round && (
        <>
          <div className="round-meta safe-meta">
            <span>{round.mode}</span>
            <span>{round.difficulty}</span>
            <span>{round.attempts.length} attempt{round.attempts.length > 1 ? 's' : ''}</span>
            <span>{round.hints.length} hint{round.hints.length > 1 ? 's' : ''}</span>
          </div>
          <div className="image-frame compact-image-frame">
            {round.imageUrl ? (
              <div className={`image-gallery image-count-${Math.min(round.imageUrls?.length || 1, 4)}`}>
                {(round.imageUrls?.length ? round.imageUrls : [round.imageUrl]).slice(0, 4).map((url, index) => (
                  <img src={url} alt={`Generated mystery ${index + 1}`} key={`${url}-${index}`} />
                ))}
              </div>
            ) : <div className="empty-state">{loading && busyAction.includes('generate') ? 'Generating image through Civitai… you can place the cursor in the guess box while waiting.' : 'Round prepared. Click Generate image to create the mystery image.'}</div>}
          </div>
          <form className="guess-form" onSubmit={submit}>
            <input ref={inputRef} value={guess} onChange={(event) => setGuess(event.target.value)} placeholder={round?.imageUrl ? 'Type your guess and press Enter…' : 'You can type here while the image is generating…'} disabled={!canType} />
            <button className="primary" disabled={!canGuess}>Guess</button>
            <button type="button" className="danger give-up-inline" onClick={onGiveUp} disabled={!canGuess}>Give up</button>
          </form>

          {round.imageUrl && !roundEnded && <HintPanel round={round} loading={loading} onHint={onHint} />}

          {!round.scoreBreakdown && round.imageUrl && !round.gaveUp && (
            <div className="score-rules-card compact-rules">
              <strong>Scoring is live</strong>
              <span>Wrong guesses unlock paid hints. Exact answers, speed, hard mode and streaks increase the score.</span>
            </div>
          )}

          {roundEnded && (
            <div className="auto-next-card">
              <strong>{round.solved ? 'Solved.' : 'Round ended.'}</strong>
              <span>The current image stays visible. The next round is prepared in the background; click Generate next image when ready.</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
