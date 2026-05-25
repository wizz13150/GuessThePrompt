import { randomUUID } from 'node:crypto';
import { PromptCacheStore } from './PromptCacheStore.js';
import { MockGenerationProvider } from './MockGenerationProvider.js';
import { CivitaiGenerationProvider } from './CivitaiGenerationProvider.js';
import { CivitaiPromptImporter } from './CivitaiPromptImporter.js';
import { LeaderboardStore } from './LeaderboardStore.js';
import { GenerationSettingsStore } from './GenerationSettingsStore.js';
import { calculateRoundScore } from './ScoringService.js';
import { getHintAvailability, unlockNextHint } from './HintService.js';
import { scoreGuess } from './similarity.js';
import { log, logError } from './logger.js';
import type { Difficulty, GameMode, GenerationProvider, GenerationSettings, HintRecord, LeaderboardPayload, ProviderMode, RequestContext, RoundState, SafeRound } from './types.js';

const DEFAULT_USERNAME = process.env.PLAYER_NAME || 'Guest';

function usernameFromContext(context?: RequestContext): string {
  const value = (context?.username || DEFAULT_USERNAME).trim();
  const cleaned = value.replace(/[^a-zA-Z0-9_.@ -]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 40) || DEFAULT_USERNAME;
}

function providerMode(): ProviderMode {
  const mode = (process.env.APP_MODE || 'civitai').toLowerCase();
  if (mode === 'mock') return 'mock';
  return 'civitai';
}

function selectGenerationProvider(): GenerationProvider {
  const mode = providerMode();
  if (mode === 'mock') return new MockGenerationProvider();
  return new CivitaiGenerationProvider();
}

export class GameEngine {
  private readonly rounds = new Map<string, RoundState>();

  constructor(
    private readonly promptStore = new PromptCacheStore(),
    private readonly generationProvider: GenerationProvider = selectGenerationProvider(),
    private readonly leaderboardStore = new LeaderboardStore(),
    private readonly generationSettingsStore = new GenerationSettingsStore()
  ) {}

  promptPreview() {
    return this.promptStore.listSafePreview();
  }

  promptStats() {
    return this.promptStore.stats();
  }

  async syncCivitaiPrompts(limit = 300, context?: RequestContext) {
    const importer = new CivitaiPromptImporter(context?.civitaiApiKey);
    const result = await importer.importFromImages(limit);
    const cache = this.promptStore.addImportedPrompts(result.imported);
    return { ...result, cache, prompts: this.promptPreview() };
  }

  leaderboard(limit = 10, context?: RequestContext): LeaderboardPayload {
    return this.leaderboardStore.payload(limit, usernameFromContext(context));
  }

  resetLeaderboard(context?: RequestContext): LeaderboardPayload {
    return this.leaderboardStore.reset(usernameFromContext(context));
  }

  generationSettings() {
    return { settings: this.generationSettingsStore.read(), presets: this.generationSettingsStore.presets };
  }

  updateGenerationSettings(patch: Partial<GenerationSettings>) {
    return { settings: this.generationSettingsStore.update(patch), presets: this.generationSettingsStore.presets };
  }

  async startRound(mode: GameMode = 'adventure', difficulty: Difficulty = 'normal'): Promise<SafeRound> {
    log('INFO', 'game', 'Starting new round', { mode, difficulty });
    const promptRecord = mode === 'classic' ? this.promptStore.pickClassicPrompt() : this.promptStore.pickAdventurePrompt();
    const round: RoundState = {
      id: randomUUID(),
      mode,
      difficulty,
      promptRecord,
      createdAt: new Date().toISOString(),
      attempts: [],
      hints: [],
      solved: false,
      gaveUp: false
    };
    this.rounds.set(round.id, round);
    log('OK', 'game', 'Round created', { roundId: round.id, mode, difficulty, title: promptRecord.title, source: promptRecord.source, qualityScore: promptRecord.qualityScore });
    return this.toSafeRound(round);
  }

  async estimate(roundId: string, context?: RequestContext) {
    const round = this.requireRound(roundId);
    log('INFO', 'game', 'Estimate requested', { roundId, title: round.promptRecord.title, difficulty: round.difficulty });
    try {
      const settings = this.generationSettingsStore.read();
      const estimate = await this.generationProvider.estimate(round.promptRecord, round.difficulty, settings, context);
      log('OK', 'game', 'Estimate finished', { roundId, buzzCost: estimate.buzzCost, provider: estimate.provider });
      return estimate;
    } catch (error) {
      logError('game', 'Estimate failed', error, { roundId });
      throw error;
    }
  }

  async generate(roundId: string, context?: RequestContext): Promise<SafeRound> {
    const round = this.requireRound(roundId);
    if (round.imageUrl) {
      log('WARN', 'game', 'Generate ignored because image already exists', { roundId });
      return this.toSafeRound(round);
    }
    log('INFO', 'game', 'Generation requested', { roundId, title: round.promptRecord.title, difficulty: round.difficulty });
    try {
      const settings = this.generationSettingsStore.read();
      const result = await this.generationProvider.generate(round.promptRecord, round.difficulty, settings, context);
      round.imageUrl = result.imageUrl;
      round.imageUrls = result.imageUrls?.length ? result.imageUrls : [result.imageUrl];
      round.imageReceivedAt = new Date().toISOString();
      log('OK', 'game', 'Generation finished', { roundId, provider: result.provider, workflowId: result.workflowId, imageUrlPreview: result.imageUrl.slice(0, 140) });
      return this.toSafeRound(round);
    } catch (error) {
      logError('game', 'Generation failed', error, { roundId });
      throw error;
    }
  }

  guess(roundId: string, guess: string, context?: RequestContext): SafeRound & { lastScore: number; lastLabel: string } {
    const round = this.requireRound(roundId);
    if (round.gaveUp || round.solved) {
      const fallbackScore = round.scoreBreakdown?.accuracy ?? 100;
      return { ...this.toSafeRound(round, true), lastScore: fallbackScore, lastLabel: round.solved ? 'already solved' : 'gave up' };
    }

    const result = scoreGuess(guess, round.promptRecord.answer);
    log('INFO', 'game', 'Guess submitted', { roundId, guess, score: result.score, label: result.label, solved: result.solved });
    round.attempts.push({ guess, score: result.score, label: result.label, at: new Date().toISOString(), solved: result.solved });

    if (result.solved) {
      round.solved = true;
      const username = usernameFromContext(context);
      const streakBeforeRound = this.leaderboardStore.currentStreak(username);
      const scoreBreakdown = calculateRoundScore(round, result.score, streakBeforeRound);
      round.scoreBreakdown = scoreBreakdown;
      const entry = this.leaderboardStore.recordSolvedRound(username, round, scoreBreakdown);
      round.leaderboardEntryId = entry.id;
      log('OK', 'game', 'Round solved and recorded', { roundId, score: scoreBreakdown.total, grade: scoreBreakdown.grade, attempts: round.attempts.length });
    }

    return { ...this.toSafeRound(round, result.solved), lastScore: result.score, lastLabel: result.label };
  }


  async reroll(roundId: string, context?: RequestContext): Promise<SafeRound> {
    const round = this.requireRound(roundId);
    log('INFO', 'game', 'Reroll requested', { roundId, title: round.promptRecord.title, difficulty: round.difficulty });
    const rerolled: RoundState = {
      id: randomUUID(),
      mode: round.mode,
      difficulty: round.difficulty,
      promptRecord: round.promptRecord,
      createdAt: new Date().toISOString(),
      attempts: [],
      hints: [],
      solved: false,
      gaveUp: false
    };
    this.rounds.set(rerolled.id, rerolled);
    return this.generate(rerolled.id, context);
  }

  hint(roundId: string): { round: SafeRound; hint: HintRecord } {
    const round = this.requireRound(roundId);
    const hint = unlockNextHint(round);
    return { round: this.toSafeRound(round), hint };
  }

  giveUp(roundId: string): SafeRound {
    const round = this.requireRound(roundId);
    round.gaveUp = true;
    return this.toSafeRound(round, true);
  }

  private requireRound(roundId: string): RoundState {
    const round = this.rounds.get(roundId);
    if (!round) throw new Error(`Unknown round: ${roundId}`);
    return round;
  }

  private toSafeRound(round: RoundState, reveal = false): SafeRound {
    const shouldReveal = reveal || round.solved || round.gaveUp;
    return {
      id: round.id,
      mode: round.mode,
      difficulty: round.difficulty,
      createdAt: round.createdAt,
      source: round.promptRecord.source,
      title: round.promptRecord.title,
      tags: round.promptRecord.tags,
      modelHint: round.promptRecord.modelHint,
      promptQualityScore: round.promptRecord.qualityScore,
      imageUrl: round.imageUrl,
      imageUrls: round.imageUrls,
      imageReceivedAt: round.imageReceivedAt,
      attempts: round.attempts,
      hints: round.hints,
      hintAvailability: getHintAvailability(round),
      solved: round.solved,
      gaveUp: round.gaveUp,
      answer: shouldReveal ? round.promptRecord.answer : undefined,
      promptPreview: shouldReveal ? round.promptRecord.prompt : undefined,
      scoreBreakdown: round.scoreBreakdown,
      leaderboardEntryId: round.leaderboardEntryId
    };
  }
}
