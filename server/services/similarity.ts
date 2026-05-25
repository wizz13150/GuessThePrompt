function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

export function scoreGuess(guess: string, answer: string): { score: number; label: string; solved: boolean } {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g) return { score: 0, label: 'empty', solved: false };
  if (g === a) return { score: 100, label: 'exact', solved: true };

  const distance = levenshtein(g, a);
  const maxLen = Math.max(g.length, a.length, 1);
  const ratio = Math.round((1 - distance / maxLen) * 100);

  if (ratio >= 88) return { score: ratio, label: 'burning', solved: true };
  if (ratio >= 70) return { score: ratio, label: 'very close', solved: false };
  if (ratio >= 45) return { score: ratio, label: 'warm', solved: false };
  if (ratio >= 25) return { score: ratio, label: 'cold', solved: false };
  return { score: Math.max(ratio, 0), label: 'freezing', solved: false };
}
