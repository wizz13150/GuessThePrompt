import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LeaderboardEntry, LeaderboardPayload, LeaderboardPlayerEntry, LeaderboardSummary, RoundState, ScoreBreakdown } from './types.js';

const DEFAULT_STORE_PATH = join(process.cwd(), 'server', 'data', 'leaderboard.local.json');

function safeReadJson(path: string): LeaderboardEntry[] {
  try {
    if (!existsSync(path)) return [];
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as LeaderboardEntry[];
  } catch {
    return [];
  }
}


function gradeRank(grade: ScoreBreakdown['grade']): number {
  return ({ S: 5, A: 4, B: 3, C: 2, D: 1 } as const)[grade];
}

function bestGrade(a: ScoreBreakdown['grade'], b: ScoreBreakdown['grade']): ScoreBreakdown['grade'] {
  return gradeRank(a) >= gradeRank(b) ? a : b;
}

function sortPlayers(players: LeaderboardPlayerEntry[]): LeaderboardPlayerEntry[] {
  return [...players].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.solvedRounds !== a.solvedRounds) return b.solvedRounds - a.solvedRounds;
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    return new Date(b.lastSolvedAt).getTime() - new Date(a.lastSolvedAt).getTime();
  });
}

function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.attemptsCount !== b.attemptsCount) return a.attemptsCount - b.attemptsCount;
    if (a.elapsedSeconds !== b.elapsedSeconds) return a.elapsedSeconds - b.elapsedSeconds;
    return new Date(a.solvedAt).getTime() - new Date(b.solvedAt).getTime();
  });
}

export class LeaderboardStore {
  private entries: LeaderboardEntry[];

  constructor(private readonly storePath = DEFAULT_STORE_PATH) {
    this.entries = safeReadJson(this.storePath);
  }

  currentStreak(username: string): number {
    const userEntries = this.entries
      .filter((entry) => entry.username === username)
      .sort((a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime());
    return userEntries[0]?.streak ?? 0;
  }

  recordSolvedRound(username: string, round: RoundState, score: ScoreBreakdown): LeaderboardEntry {
    const entry: LeaderboardEntry = {
      id: randomUUID(),
      username,
      score: score.total,
      grade: score.grade,
      answer: round.promptRecord.answer,
      title: round.promptRecord.title,
      mode: round.mode,
      difficulty: round.difficulty,
      source: round.promptRecord.source,
      modelHint: round.promptRecord.modelHint,
      attemptsCount: score.attemptsCount,
      accuracy: score.accuracy,
      elapsedSeconds: score.elapsedSeconds,
      streak: this.currentStreak(username) + 1,
      solvedAt: new Date().toISOString(),
      scoreBreakdown: score
    };

    this.entries.push(entry);
    this.entries = sortEntries(this.entries).slice(0, 250);
    this.persist();
    return entry;
  }


  playerRankings(limit = 10): LeaderboardPlayerEntry[] {
    const map = new Map<string, LeaderboardPlayerEntry>();
    for (const entry of this.entries) {
      const existing = map.get(entry.username);
      if (!existing) {
        map.set(entry.username, {
          username: entry.username,
          totalScore: entry.score,
          solvedRounds: 1,
          bestScore: entry.score,
          averageScore: entry.score,
          currentStreak: this.currentStreak(entry.username),
          lastSolvedAt: entry.solvedAt,
          bestGrade: entry.grade
        });
        continue;
      }
      existing.totalScore += entry.score;
      existing.solvedRounds += 1;
      existing.bestScore = Math.max(existing.bestScore, entry.score);
      existing.averageScore = Math.round(existing.totalScore / existing.solvedRounds);
      existing.currentStreak = this.currentStreak(entry.username);
      existing.lastSolvedAt = new Date(entry.solvedAt).getTime() > new Date(existing.lastSolvedAt).getTime() ? entry.solvedAt : existing.lastSolvedAt;
      existing.bestGrade = bestGrade(existing.bestGrade, entry.grade);
    }
    return sortPlayers([...map.values()]).map((player, index) => ({ ...player, rank: index + 1 })).slice(0, limit);
  }

  payload(limit = 10, username = 'Wizz'): LeaderboardPayload {
    const ranked = sortEntries(this.entries).map((entry, index) => ({ ...entry, rank: index + 1 }));
    return {
      entries: ranked.slice(0, limit),
      players: this.playerRankings(limit),
      summary: this.summary(username),
      updatedAt: new Date().toISOString()
    };
  }

  summary(username = 'Wizz'): LeaderboardSummary {
    const userEntries = this.entries.filter((entry) => entry.username === username);
    const totalScore = userEntries.reduce((sum, entry) => sum + entry.score, 0);
    const bestScore = userEntries.reduce((best, entry) => Math.max(best, entry.score), 0);
    const averageScore = userEntries.length ? Math.round(totalScore / userEntries.length) : 0;
    return {
      username,
      totalScore,
      solvedRounds: userEntries.length,
      bestScore,
      averageScore,
      currentStreak: this.currentStreak(username)
    };
  }

  reset(username = 'Guest'): LeaderboardPayload {
    this.entries = [];
    this.persist();
    return this.payload(10, username);
  }

  private persist() {
    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, JSON.stringify(this.entries, null, 2), 'utf8');
  }
}
