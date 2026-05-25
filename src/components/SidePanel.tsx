import type { LeaderboardPayload, SafeRound, ScoreBreakdown } from '../lib/api';

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining.toString().padStart(2, '0')}s`;
}

function scoreRows(score: ScoreBreakdown) {
  return [
    ['Base', score.base],
    ['Accuracy', score.accuracyBonus],
    ['Time', score.timeBonus],
    ['Quality', score.qualityBonus],
    ['Adventure', score.adventureBonus],
    ['Difficulty', score.difficultyBonus],
    ['Streak', score.streakBonus],
    ['Attempts', -score.attemptPenalty],
    ['Hints', -score.hintPenalty]
  ] as Array<[string, number]>;
}

function ScoreResult({ round }: { round: SafeRound | null }) {
  if (!round) return <p className="muted">Solve or abandon a round to display the latest result here.</p>;
  const score = round.scoreBreakdown;
  return (
    <div className="clean-result-card">
      <div className="clean-result-head">
        <div>
          <span>Answer</span>
          <strong>{round.answer ?? '—'}</strong>
        </div>
        {score && <b>Grade {score.grade}</b>}
      </div>
      {score ? (
        <>
          <div className="clean-score-total">
            <span>Round score</span>
            <strong>{score.total}</strong>
            <small>{score.accuracy}% accuracy · {formatSeconds(score.elapsedSeconds)}</small>
          </div>
          <div className="clean-kpi-grid">
            <div><span>Attempts</span><strong>{score.attemptsCount}</strong></div>
            <div><span>Hints</span><strong>{score.hintsUsed}</strong></div>
            <div><span>Mode</span><strong>{round.mode}</strong></div>
            <div><span>Difficulty</span><strong>{round.difficulty}</strong></div>
          </div>
          <div className="clean-breakdown-list">
            {scoreRows(score).map(([label, value]) => (
              <div key={label}><span>{label}</span><strong className={value < 0 ? 'negative-score' : undefined}>{value > 0 ? `+${value}` : value}</strong></div>
            ))}
          </div>
        </>
      ) : <p className="muted">No score was recorded because the round was abandoned.</p>}
      {round.promptPreview && <details className="prompt-details"><summary>Reveal full generation prompt</summary><p>{round.promptPreview}</p></details>}
    </div>
  );
}

function CurrentRoundPanel({ round }: { round: SafeRound | null }) {
  if (!round) return <p className="muted">No active round yet.</p>;
  return (
    <div className="current-round-card clean-current-card">
      <div><span>Mode</span><strong>{round.mode}</strong></div>
      <div><span>Difficulty</span><strong>{round.difficulty}</strong></div>
      <div><span>Attempts</span><strong>{round.attempts.length}</strong></div>
      <div><span>Hints</span><strong>{round.hints.length}</strong></div>
      <div><span>Images</span><strong>{round.imageUrls?.length || (round.imageUrl ? 1 : 0)}</strong></div>
    </div>
  );
}

export function SidePanel({
  round,
  resultRound,
  leaderboard,
  loading,
  onResetLeaderboard,
  onRerollRound,
  onNextRound
}: {
  round: SafeRound | null;
  resultRound: SafeRound | null;
  prompts: Array<{ id: string; answer: string; title: string; tags: string[]; source: string; qualityScore: number; modelHint: string }>;
  leaderboard: LeaderboardPayload | null;
  loading: boolean;
  onResetLeaderboard: () => void;
  onRerollRound: () => void;
  onNextRound: () => void;
}) {
  return (
    <aside className="side-stack compact-side-stack improved-side-stack clean-side-stack">
      <section className="panel result-panel clean-side-panel">
        <div className="panel-title">Round result</div>
        <ScoreResult round={resultRound} />
        <div className="round-result-actions">
          <button type="button" className="small-button" onClick={onRerollRound} disabled={loading || !round}>Reroll this round</button>
          <button type="button" className="small-button primary" onClick={onNextRound} disabled={loading || !resultRound}>Next round</button>
        </div>
      </section>

      <section className="panel clean-side-panel">
        <div className="panel-title">Current round</div>
        <CurrentRoundPanel round={round} />
      </section>

      <section className="panel leaderboard-panel clean-side-panel">
        <div className="leaderboard-heading">
          <div>
            <div className="panel-title">Players leaderboard</div>
            <h3>Ranked players</h3>
          </div>
          <button className="small-button danger-light" onClick={onResetLeaderboard} disabled={loading || !leaderboard?.entries.length}>Reset</button>
        </div>
        <div className="summary-grid condensed-summary">
          <div><span>Total</span><strong>{leaderboard?.summary.totalScore ?? 0}</strong></div>
          <div><span>Best</span><strong>{leaderboard?.summary.bestScore ?? 0}</strong></div>
          <div><span>Streak</span><strong>×{leaderboard?.summary.currentStreak ?? 0}</strong></div>
        </div>
        {!leaderboard?.players?.length && <p className="muted">Solve a round to create the first ranked player.</p>}
        <div className="leaderboard-list compact-leaderboard-list">
          {leaderboard?.players.slice(0, 4).map((player) => (
            <div className="leaderboard-entry" key={player.username}>
              <div className="rank-pill">#{player.rank}</div>
              <div className="leaderboard-main">
                <strong>{player.username}</strong>
                <small>{player.solvedRounds} solved · best {player.bestScore} · avg {player.averageScore}</small>
              </div>
              <div className="leaderboard-score"><strong>{player.totalScore}</strong><span>{player.bestGrade}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel clean-side-panel">
        <div className="panel-title">Attempts</div>
        {!round?.attempts.length && <p className="muted">No guess yet.</p>}
        {round?.attempts.slice(-5).map((attempt, index) => (
          <div className="attempt attempt-with-meter" key={`${attempt.at}-${index}`}>
            <div>
              <strong>{attempt.guess}</strong>
              <span>{attempt.score}% · {attempt.label}</span>
            </div>
            <div className="attempt-meter" aria-hidden="true"><i style={{ width: `${attempt.score}%` }} /></div>
          </div>
        ))}
      </section>
    </aside>
  );
}
