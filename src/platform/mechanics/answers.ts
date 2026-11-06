/**
 * Forgiving free-text answer matching for guessing and trivia games.
 *
 * Ignores case, accents, punctuation, spacing and a leading "the/a/an", and
 * allows a few typos that scale with the answer's length.
 */

/** Canonical form of an answer: "The Lion-King!" → "lion king". */
export function normalizeAnswer(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/['’`]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .replace(/^(the|a|an) /, '');
}

/** Levenshtein distance. */
export function editDistance(a: string, b: string): number {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = row;
    }
    return prev[b.length];
}

/** Typos tolerated for an answer of this many letters (spaces excluded). */
export function typoAllowance(length: number): number {
    if (length <= 3) return 0;
    if (length <= 6) return 1;
    if (length <= 12) return 2;
    return 3;
}

/** True when the guess matches any accepted answer. */
export function matchesAnswer(guess: string, accepted: readonly string[]): boolean {
    const g = normalizeAnswer(guess).replace(/ /g, '');
    if (!g) return false;
    return accepted.some(answer => {
        const a = normalizeAnswer(answer).replace(/ /g, '');
        return !!a && (g === a || editDistance(g, a) <= typoAllowance(a.length));
    });
}
