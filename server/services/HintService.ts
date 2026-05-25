import type { HintAvailability, HintLevel, HintRecord, RoundState } from './types.js';

const HINT_RULES: Record<HintLevel, { requiredAttempts: number; cost: number; label: string }> = {
  1: { requiredAttempts: 2, cost: 90, label: 'Category hint' },
  2: { requiredAttempts: 3, cost: 160, label: 'Structure hint' },
  3: { requiredAttempts: 4, cost: 260, label: 'Prompt hint' }
};

function maskAnswer(answer: string) {
  return answer
    .split('')
    .map((char, index) => {
      if (!/[a-z0-9]/i.test(char)) return char;
      if (index === 0 || index === answer.length - 1) return char;
      if ('aeiouy'.includes(char.toLowerCase())) return char;
      return '·';
    })
    .join('');
}

function promptFragment(prompt: string, answer: string) {
  const clean = prompt.replace(new RegExp(answer, 'ig'), '[hidden answer]');
  const clause = clean.split(/[,.]/).map((part) => part.trim()).find((part) => part.length >= 24);
  return clause ? `${clause.slice(0, 120)}${clause.length > 120 ? '…' : ''}` : 'The image prompt contains strong visual context around the hidden answer.';
}

function nextHintLevel(round: RoundState): HintLevel | null {
  const used = new Set(round.hints.map((hint) => hint.level));
  if (!used.has(1)) return 1;
  if (!used.has(2)) return 2;
  if (!used.has(3)) return 3;
  return null;
}

export function getHintAvailability(round: RoundState): HintAvailability {
  if (round.solved) return { nextLevel: null, available: false, requiredAttempts: null, cost: null, reason: 'Round already solved.' };
  if (round.gaveUp) return { nextLevel: null, available: false, requiredAttempts: null, cost: null, reason: 'Round abandoned.' };

  const level = nextHintLevel(round);
  if (!level) return { nextLevel: null, available: false, requiredAttempts: null, cost: null, reason: 'All hints unlocked.' };

  const rule = HINT_RULES[level];
  const wrongAttempts = round.attempts.filter((attempt) => !attempt.solved).length;
  const missing = Math.max(0, rule.requiredAttempts - wrongAttempts);

  return {
    nextLevel: level,
    available: missing === 0,
    requiredAttempts: rule.requiredAttempts,
    cost: rule.cost,
    reason: missing === 0 ? `${rule.label} available.` : `${missing} more wrong guess${missing > 1 ? 'es' : ''} before the next hint.`
  };
}

export function unlockNextHint(round: RoundState): HintRecord {
  const availability = getHintAvailability(round);
  if (!availability.nextLevel || !availability.available) {
    throw new Error(availability.reason);
  }

  const level = availability.nextLevel;
  const rule = HINT_RULES[level];
  const answer = round.promptRecord.answer.toLowerCase();
  const text = level === 1
    ? `Visual category: ${round.promptRecord.tags.slice(0, 3).join(' · ') || round.promptRecord.source}.`
    : level === 2
      ? `Answer structure: ${answer.length} characters, starts with “${answer[0]}”, pattern “${maskAnswer(answer)}”.`
      : `Prompt fragment: “${promptFragment(round.promptRecord.prompt, answer)}”.`;

  const hint: HintRecord = {
    level,
    label: rule.label,
    text,
    cost: rule.cost,
    unlockedAtAttempt: round.attempts.length,
    at: new Date().toISOString()
  };

  round.hints.push(hint);
  return hint;
}
