export type GameMode = 'classic' | 'adventure';
export type Difficulty = 'easy' | 'normal' | 'hard';

export type ProviderMode = 'mock' | 'civitai-images' | 'civitai';

export type RequestContext = {
  civitaiApiKey?: string;
  username?: string;
};

export type PromptRecord = {
  id: string;
  answer: string;
  title: string;
  prompt: string;
  negativePrompt: string;
  tags: string[];
  source: string;
  nsfw: boolean;
  modelHint: string;
  qualityScore: number;
  sourceImageUrl?: string;
  sourceImagePageUrl?: string;
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

export const FLUX2_KLEIN_AIR = 'urn:air:flux2:checkpoint:civitai:2322332@2612554';
export const FLUX_KREA_DEV_AIR = 'urn:air:fluxkrea:checkpoint:civitai:618692@2068000';
export const SDXL_AIR = 'urn:air:sdxl:checkpoint:civitai:101055@128078';
export const Z_IMAGE_TURBO_AIR = 'urn:air:zimageturbo:checkpoint:civitai:2168935@2442439';

export const DEFAULT_MODEL_AIR = SDXL_AIR;

export const MODEL_PRESETS: GenerationModelPreset[] = [
  {
    id: 'flux2-klein-9b',
    label: 'Flux.2 Klein 9B',
    air: FLUX2_KLEIN_AIR,
    description: 'Flux.2 Klein 9B preset. Uses 8 steps. CFG and negative prompt are disabled for this preset while the Civitai workflow is stabilized.',
    fixedSteps: 8,
    fixedCfgScale: null
  },
  {
    id: 'flux-krea-dev',
    label: 'Flux.1 Krea Dev',
    air: FLUX_KREA_DEV_AIR,
    description: 'Flux.1 Krea Dev preset for Krea-style prompt interpretation and modern image generation.'
  },
  {
    id: 'sdxl-base',
    label: 'SDXL · default',
    air: SDXL_AIR,
    description: 'Default SDXL checkpoint preset for broad compatibility. Uses 28 steps, CFG 5, and supports negative prompt.'
  },
  {
    id: 'z-image-turbo',
    label: 'Z-Image Turbo',
    air: Z_IMAGE_TURBO_AIR,
    description: 'Z-Image Turbo preset for fast alternative image generation when available in Civitai Generator. Steps are fixed to 9 and CFG is fixed to 1.',
    fixedSteps: 9,
    fixedCfgScale: 1
  },
  {
    id: 'custom-air',
    label: 'Custom checkpoint AIR URN',
    air: '',
    description: 'Paste any compatible Civitai Generator checkpoint AIR URN.'
  }
];

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  modelPreset: 'sdxl-base',
  modelAir: DEFAULT_MODEL_AIR,
  width: 1024,
  height: 1024,
  steps: 28,
  cfgScale: 5,
  batch: 1,
  seed: null,
  negativePromptExtra: '',
  loras: []
};

export type AttemptResult = {
  guess: string;
  score: number;
  label: string;
  at: string;
  solved: boolean;
};

export type HintLevel = 1 | 2 | 3;

export type HintRecord = {
  level: HintLevel;
  label: string;
  text: string;
  cost: number;
  unlockedAtAttempt: number;
  at: string;
};

export type HintAvailability = {
  nextLevel: HintLevel | null;
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
  mode: GameMode;
  difficulty: Difficulty;
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

export type RoundState = {
  id: string;
  mode: GameMode;
  difficulty: Difficulty;
  promptRecord: PromptRecord;
  createdAt: string;
  imageUrl?: string;
  imageUrls?: string[];
  imageReceivedAt?: string;
  attempts: AttemptResult[];
  hints: HintRecord[];
  solved: boolean;
  gaveUp: boolean;
  scoreBreakdown?: ScoreBreakdown;
  leaderboardEntryId?: string;
};

export type SafeRound = {
  id: string;
  mode: GameMode;
  difficulty: Difficulty;
  createdAt: string;
  source: string;
  title: string;
  tags: string[];
  modelHint: string;
  promptQualityScore: number;
  imageUrl?: string;
  imageUrls?: string[];
  imageReceivedAt?: string;
  attempts: RoundState['attempts'];
  hints: HintRecord[];
  hintAvailability: HintAvailability;
  solved: boolean;
  gaveUp: boolean;
  answer?: string;
  promptPreview?: string;
  scoreBreakdown?: ScoreBreakdown;
  leaderboardEntryId?: string;
};

export type EstimateResult = {
  buzzCost: number;
  provider: ProviderMode;
  width: number;
  height: number;
  steps: number;
  batch: number;
  cfgScale: number | null;
  modelHint: string;
  modelAir: string;
};

export interface GenerationProvider {
  estimate(record: PromptRecord, difficulty: Difficulty, settings: GenerationSettings, context?: RequestContext): Promise<EstimateResult>;
  generate(record: PromptRecord, difficulty: Difficulty, settings: GenerationSettings, context?: RequestContext): Promise<{ imageUrl: string; imageUrls: string[]; provider: string; workflowId?: string }>;
}
