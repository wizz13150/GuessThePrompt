
export type PublicDemoCredentials = {
  username: string;
  apiKey: string;
};

const CIVITAI_SESSION_STORAGE_KEY = 'guess-the-prompt-public-demo-civitai-session-v1';

function sanitizeUsername(input: string): string {
  return input.replace(/[^a-zA-Z0-9_.@ -]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function normalizeCredentials(credentials: Partial<PublicDemoCredentials> | null | undefined): PublicDemoCredentials {
  return {
    username: sanitizeUsername(credentials?.username ?? '') || 'Guest',
    apiKey: (credentials?.apiKey ?? '').trim()
  };
}

export function getStoredCivitaiCredentials(): PublicDemoCredentials {
  try {
    const raw = window.sessionStorage.getItem(CIVITAI_SESSION_STORAGE_KEY);
    return normalizeCredentials(raw ? JSON.parse(raw) as Partial<PublicDemoCredentials> : null);
  } catch {
    return normalizeCredentials(null);
  }
}

export function saveCivitaiCredentials(credentials: PublicDemoCredentials): PublicDemoCredentials {
  const normalized = normalizeCredentials(credentials);
  window.sessionStorage.setItem(CIVITAI_SESSION_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearCivitaiCredentials(): PublicDemoCredentials {
  window.sessionStorage.removeItem(CIVITAI_SESSION_STORAGE_KEY);
  return normalizeCredentials(null);
}

function publicDemoHeaders(): Record<string, string> {
  const credentials = getStoredCivitaiCredentials();
  const headers: Record<string, string> = {};
  if (credentials.username) headers['X-Player-Name'] = credentials.username;
  if (credentials.apiKey) headers['X-Civitai-API-Key'] = credentials.apiKey;
  return headers;
}

export type UserInfo = {
  authenticated: boolean;
  mode: string;
  user: {
    id: string;
    username: string;
    buzzBalance: number;
    avatarUrl: string | null;
    grantedScopes: string[];
  };
};

export type AppHealth = {
  status: 'ok';
  version?: string;
  mode: 'mock' | 'civitai-images' | 'civitai';
  uptime: number;
  civitai: {
    apiKeyConfigured: boolean;
    orchestratorEnabled: boolean;
    publicImageProviderEnabled: boolean;
    modelAir: string;
  };
  promptCache: PromptCacheStats;
};


export type GenerationLora = {
  id: string;
  enabled: boolean;
  air: string;
  strength: number;
  triggerWords: string;
};

export type GenerationSettings = {
  modelPreset: 'flux2-klein-9b' | 'flux-krea-dev' | 'sdxl-base' | 'z-image-turbo' | 'custom-air';
  modelAir: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  batch: number;
  seed: number | null;
  negativePromptExtra: string;
  loras: GenerationLora[];
};

export type GenerationModelPreset = {
  id: GenerationSettings['modelPreset'];
  label: string;
  air: string;
  description: string;
  fixedSteps?: number;
  fixedCfgScale?: number | null;
};

export type GenerationSettingsPayload = {
  settings: GenerationSettings;
  presets: GenerationModelPreset[];
};

export type PromptCacheStats = {
  total: number;
  live: number;
  samples: number;
  bestQuality: number;
  cachePath: string;
};

export type PromptPreview = {
  id: string;
  answer: string;
  title: string;
  tags: string[];
  source: string;
  qualityScore: number;
  modelHint: string;
  hasSourceImage?: boolean;
  sourceImagePageUrl?: string;
};

export type PromptSyncResult = {
  imported: PromptPreview[];
  scanned: number;
  skipped: number;
  source: string;
  cache: {
    imported: number;
    retainedLiveCache: number;
    totalCache: number;
  };
  prompts: PromptPreview[];
};

export type AttemptResult = { guess: string; score: number; label: string; at: string; solved: boolean };

export type HintRecord = {
  level: 1 | 2 | 3;
  label: string;
  text: string;
  cost: number;
  unlockedAtAttempt: number;
  at: string;
};

export type HintAvailability = {
  nextLevel: 1 | 2 | 3 | null;
  available: boolean;
  requiredAttempts: number | null;
  cost: number | null;
  reason: string;
};

export type ScoreBreakdown = {
  total: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  base: number;
  accuracyBonus: number;
  timeBonus: number;
  qualityBonus: number;
  adventureBonus: number;
  difficultyBonus: number;
  streakBonus: number;
  attemptPenalty: number;
  hintPenalty: number;
  accuracy: number;
  attemptsCount: number;
  hintsUsed: number;
  elapsedSeconds: number;
  maxPossible: number;
  rules: {
    difficultyLabel: string;
    multiplier: number;
    timeWindowSeconds: number;
    attemptPenalty: number;
  };
};

export type LeaderboardEntry = {
  id: string;
  rank?: number;
  username: string;
  score: number;
  grade: ScoreBreakdown['grade'];
  answer: string;
  title: string;
  mode: SafeRound['mode'];
  difficulty: SafeRound['difficulty'];
  source: string;
  modelHint: string;
  attemptsCount: number;
  accuracy: number;
  elapsedSeconds: number;
  streak: number;
  solvedAt: string;
  scoreBreakdown: ScoreBreakdown;
};

export type LeaderboardSummary = {
  username: string;
  totalScore: number;
  solvedRounds: number;
  bestScore: number;
  averageScore: number;
  currentStreak: number;
};

export type LeaderboardPlayerEntry = {
  rank?: number;
  username: string;
  totalScore: number;
  solvedRounds: number;
  bestScore: number;
  averageScore: number;
  currentStreak: number;
  lastSolvedAt: string;
  bestGrade: ScoreBreakdown['grade'];
};

export type LeaderboardPayload = {
  entries: LeaderboardEntry[];
  players: LeaderboardPlayerEntry[];
  summary: LeaderboardSummary;
  updatedAt: string;
};

export type SafeRound = {
  id: string;
  mode: 'classic' | 'adventure';
  difficulty: 'easy' | 'normal' | 'hard';
  createdAt: string;
  source: string;
  title: string;
  tags: string[];
  modelHint: string;
  promptQualityScore: number;
  imageUrl?: string;
  imageUrls?: string[];
  imageReceivedAt?: string;
  attempts: AttemptResult[];
  hints: HintRecord[];
  hintAvailability: HintAvailability;
  solved: boolean;
  gaveUp: boolean;
  answer?: string;
  promptPreview?: string;
  scoreBreakdown?: ScoreBreakdown;
  leaderboardEntryId?: string;
};

export type Estimate = {
  buzzCost: number;
  provider: 'mock' | 'civitai-images' | 'civitai';
  width: number;
  height: number;
  steps: number;
  batch: number;
  cfgScale: number | null;
  modelHint: string;
  modelAir: string;
};

export type DebugLogsPayload = { logs: string[] };

type JsonErrorPayload = { error?: string; [key: string]: unknown };

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const startedAt = performance.now();
  console.info(`[Guess The Prompt API] ${method} ${url} started`);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...publicDemoHeaders(),
        ...(init?.headers ?? {})
      }
    });
  } catch (error) {
    console.error(`[Guess The Prompt API] ${method} ${url} network failure`, error);
    throw error;
  }

  const rawText = await response.text();
  let payload: JsonErrorPayload | T | Record<string, never> = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = { error: rawText || `Request failed: ${response.status}` };
  }

  const durationMs = Math.round(performance.now() - startedAt);
  const requestId = response.headers.get('x-request-id');
  const logPayload = { status: response.status, requestId, durationMs, payload };
  if (response.ok) console.info(`[Guess The Prompt API] ${method} ${url} finished`, logPayload);
  else console.error(`[Guess The Prompt API] ${method} ${url} failed`, logPayload);

  if (!response.ok) {
    const errorMessage = (payload as JsonErrorPayload).error ?? `Request failed: ${response.status}`;
    throw new Error(`${errorMessage}${requestId ? ` · requestId=${requestId}` : ''}`);
  }

  return payload as T;
}

export const api = {
  health: () => jsonFetch<AppHealth>('/api/health'),
  debugLogs: (limit = 160) => jsonFetch<DebugLogsPayload>(`/api/debug/logs?limit=${limit}`),
  orchestratorTest: () => jsonFetch<{ ok: boolean; roundId?: string; estimate?: Estimate; error?: string }>('/api/debug/orchestrator-test', { method: 'POST' }),
  login: (credentials: PublicDemoCredentials) => jsonFetch<{ ok: boolean; mode: string; message?: string; user?: { username: string }; error?: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => jsonFetch<UserInfo>('/api/me'),
  leaderboard: () => jsonFetch<{ leaderboard: LeaderboardPayload }>('/api/leaderboard'),
  resetLeaderboard: () => jsonFetch<{ leaderboard: LeaderboardPayload }>('/api/leaderboard/reset', { method: 'POST' }),
  generationSettings: () => jsonFetch<GenerationSettingsPayload>('/api/generation/settings'),
  updateGenerationSettings: (settings: Partial<GenerationSettings>) =>
    jsonFetch<GenerationSettingsPayload>('/api/generation/settings', { method: 'POST', body: JSON.stringify(settings) }),
  cachePreview: () => jsonFetch<{ prompts: PromptPreview[]; stats: PromptCacheStats }>('/api/prompts/cache-preview'),
  syncCivitaiPrompts: (limit = 60) => jsonFetch<PromptSyncResult>('/api/prompts/sync-civitai', { method: 'POST', body: JSON.stringify({ limit }) }),
  newRound: (mode: SafeRound['mode'], difficulty: SafeRound['difficulty']) =>
    jsonFetch<{ round: SafeRound }>('/api/game/new-round', { method: 'POST', body: JSON.stringify({ mode, difficulty }) }),
  estimate: (roundId: string) => jsonFetch<{ estimate: Estimate }>(`/api/game/${roundId}/estimate`, { method: 'POST' }),
  generate: (roundId: string) => jsonFetch<{ round: SafeRound }>(`/api/game/${roundId}/generate`, { method: 'POST' }),
  reroll: (roundId: string) => jsonFetch<{ round: SafeRound }>(`/api/game/${roundId}/reroll`, { method: 'POST' }),
  guess: (roundId: string, guess: string) =>
    jsonFetch<{ round: SafeRound & { lastScore: number; lastLabel: string }; leaderboard: LeaderboardPayload }>(`/api/game/${roundId}/guess`, { method: 'POST', body: JSON.stringify({ guess }) }),
  hint: (roundId: string) => jsonFetch<{ round: SafeRound; hint: HintRecord }>(`/api/game/${roundId}/hint`, { method: 'POST' }),
  giveUp: (roundId: string) => jsonFetch<{ round: SafeRound; leaderboard: LeaderboardPayload }>(`/api/game/${roundId}/give-up`, { method: 'POST' })
};
