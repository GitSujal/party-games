/**
 * Secret-role assignment.
 *
 *   const n = countFromRatio(players.length, 0.25);           // e.g. 25% imposters
 *   const roles = assignRoles(ids, { imposter: n }, 'genuine', random);
 */
import type { Random } from '../sdk';

/**
 * How many special roles for a group size: floor(total * ratio), at least `min`,
 * and always strictly fewer than half the group so the game stays winnable.
 */
export function countFromRatio(total: number, ratio: number, min = 1): number {
    const maxAllowed = Math.max(0, Math.ceil(total / 2) - 1);
    return Math.min(maxAllowed, Math.max(min, Math.floor(total * ratio)));
}

/** Randomly give each special role its count; everyone else gets `fallback`. */
export function assignRoles<Special extends string, Fallback extends string>(
    playerIds: string[],
    counts: Partial<Record<Special, number>>,
    fallback: Fallback,
    random: Random
): Record<string, Special | Fallback> {
    type R = Special | Fallback;
    const entries = Object.entries(counts) as [Special, number][];
    const needed = entries.reduce((sum, [, n]) => sum + n, 0);
    if (needed > playerIds.length) throw new Error(`Need ${needed} players for these roles, have ${playerIds.length}`);

    const shuffled = random.shuffle(playerIds);
    const out: Record<string, R> = {};
    let i = 0;
    for (const [role, count] of entries) {
        for (let k = 0; k < count; k++) out[shuffled[i++]] = role;
    }
    for (; i < shuffled.length; i++) out[shuffled[i]] = fallback;
    return out;
}

export function playersWithRole<R extends string>(roles: Record<string, R>, role: R): string[] {
    return Object.entries(roles)
        .filter(([, r]) => r === role)
        .map(([id]) => id);
}
