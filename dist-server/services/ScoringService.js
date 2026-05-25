const DIFFICULTY_RULES = {
    easy: { label: 'Easy', multiplier: 0.85, timeWindowSeconds: 180, maxTimeBonus: 160, attemptPenalty: 90 },
    normal: { label: 'Normal', multiplier: 1, timeWindowSeconds: 150, maxTimeBonus: 220, attemptPenalty: 125 },
    hard: { label: 'Hard', multiplier: 1.25, timeWindowSeconds: 120, maxTimeBonus: 300, attemptPenalty: 165 }
};
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function gradeFor(total) {
    if (total >= 1800)
        return 'S';
    if (total >= 1450)
        return 'A';
    if (total >= 1100)
        return 'B';
    if (total >= 750)
        return 'C';
    return 'D';
}
export function getScoreRules(difficulty) {
    return DIFFICULTY_RULES[difficulty];
}
export function calculateRoundScore(round, accuracy, streakBeforeRound) {
    const rules = DIFFICULTY_RULES[round.difficulty];
    const solvedAtMs = Date.now();
    const startedAtMs = Date.parse(round.imageReceivedAt || round.createdAt);
    const elapsedSeconds = Math.max(0, Math.floor((solvedAtMs - startedAtMs) / 1000));
    const attemptsCount = Math.max(round.attempts.length, 1);
    const base = 700;
    const accuracyBonus = Math.round(clamp(accuracy, 0, 100) * 4);
    const remainingRatio = clamp((rules.timeWindowSeconds - elapsedSeconds) / rules.timeWindowSeconds, 0, 1);
    const timeBonus = Math.round(rules.maxTimeBonus * remainingRatio);
    const qualityBonus = Math.round(clamp(round.promptRecord.qualityScore, 0, 100) * 0.8);
    const adventureBonus = round.mode === 'adventure' ? 120 : 0;
    const difficultyBonus = Math.round((base + accuracyBonus + timeBonus + qualityBonus + adventureBonus) * (rules.multiplier - 1));
    const attemptPenalty = Math.max(0, attemptsCount - 1) * rules.attemptPenalty;
    const hintPenalty = (round.hints ?? []).reduce((sum, hint) => sum + hint.cost, 0);
    const streakBonus = Math.min(250, Math.max(0, streakBeforeRound) * 35);
    const raw = base + accuracyBonus + timeBonus + qualityBonus + adventureBonus + difficultyBonus + streakBonus - attemptPenalty - hintPenalty;
    const total = Math.max(50, Math.round(raw));
    const maxPossible = Math.round(700 + 400 + rules.maxTimeBonus + 80 + adventureBonus + Math.max(0, (700 + 400 + rules.maxTimeBonus + 80 + adventureBonus) * (rules.multiplier - 1)) + 250);
    return {
        total,
        grade: gradeFor(total),
        base,
        accuracyBonus,
        timeBonus,
        qualityBonus,
        adventureBonus,
        difficultyBonus,
        streakBonus,
        attemptPenalty,
        hintPenalty,
        accuracy: Math.round(accuracy),
        attemptsCount,
        hintsUsed: round.hints?.length ?? 0,
        elapsedSeconds,
        maxPossible,
        rules: {
            difficultyLabel: rules.label,
            multiplier: rules.multiplier,
            timeWindowSeconds: rules.timeWindowSeconds,
            attemptPenalty: rules.attemptPenalty
        }
    };
}
