import type { Random } from '../sdk';

/** Shuffle players into `teamCount` teams whose sizes differ by at most one. */
export function splitIntoTeams(playerIds: string[], teamCount: number, random: Random): string[][] {
    if (teamCount < 1) throw new Error('teamCount must be at least 1');
    const teams: string[][] = Array.from({ length: teamCount }, () => []);
    random.shuffle(playerIds).forEach((id, i) => teams[i % teamCount].push(id));
    return teams;
}

export function teamOf(teams: string[][], playerId: string): number {
    return teams.findIndex(t => t.includes(playerId));
}
