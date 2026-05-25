import type { LeaderboardPayload } from '../lib/api';

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining.toString().padStart(2, '0')}s`;
}

export function LeaderboardPage({ leaderboard, loading, onReset }: { leaderboard: LeaderboardPayload | null; loading: boolean; onReset: () => void }) {
  return (
    <section className="tab-page">
      <div className="tab-hero-card">
        <div>
          <div className="eyebrow">Leaderboard · local ranking</div>
          <h1>Ranked score board</h1>
          <p>The main leaderboard ranks players by their accumulated score. Recent solved rounds are kept below for audit and debugging.</p>
        </div>
        <button className="danger" onClick={onReset} disabled={loading || !leaderboard?.players?.length}>Reset leaderboard</button>
      </div>

      <div className="summary-grid page-summary">
        <div><span>Total</span><strong>{leaderboard?.summary.totalScore ?? 0}</strong></div>
        <div><span>Best</span><strong>{leaderboard?.summary.bestScore ?? 0}</strong></div>
        <div><span>Average</span><strong>{leaderboard?.summary.averageScore ?? 0}</strong></div>
        <div><span>Streak</span><strong>×{leaderboard?.summary.currentStreak ?? 0}</strong></div>
      </div>

      <section className="panel wide-panel">
        <div className="panel-title">Players ranking</div>
        {!leaderboard?.players?.length ? (
          <div className="empty-state large-empty">No ranked player yet. Go to Play, generate an image, and guess the hidden answer.</div>
        ) : (
          <div className="rank-table player-rank-table">
            <div className="rank-row rank-head"><span>Rank</span><span>Player</span><span>Solved</span><span>Best</span><span>Average</span><span>Streak</span><span>Best grade</span><span>Total</span></div>
            {leaderboard.players.map((player) => (
              <div className="rank-row" key={player.username}>
                <span>#{player.rank}</span>
                <span>{player.username}</span>
                <span>{player.solvedRounds}</span>
                <span>{player.bestScore}</span>
                <span>{player.averageScore}</span>
                <span>×{player.currentStreak}</span>
                <span>{player.bestGrade}</span>
                <strong>{player.totalScore}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel wide-panel">
        <div className="panel-title">Recent solved rounds</div>
        {!leaderboard?.entries.length ? <p className="muted">No solved round details yet.</p> : (
          <div className="rank-table">
            <div className="rank-row rank-head"><span>#</span><span>Player</span><span>Answer</span><span>Mode</span><span>Attempts</span><span>Time</span><span>Grade</span><span>Score</span></div>
            {leaderboard.entries.slice(0, 10).map((entry) => (
              <div className="rank-row" key={entry.id}>
                <span>#{entry.rank}</span><span>{entry.username}</span><span>{entry.answer}</span><span>{entry.mode} · {entry.difficulty}</span><span>{entry.attemptsCount}</span><span>{formatSeconds(entry.elapsedSeconds)}</span><span>{entry.grade}</span><strong>{entry.score}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
