/** Per-player (or per-team) points with a ranked leaderboard. */
export type Scores = Record<string, number>;

export function addPoints(scores: Scores, id: string, points: number): void {
    scores[id] = (scores[id] ?? 0) + points;
}

export interface LeaderboardRow {
    id: string;
    score: number;
    /** 1-based, shared on ties ("1, 2, 2, 4"). */
    rank: number;
}

export function leaderboard(scores: Scores, ids: string[] = Object.keys(scores)): LeaderboardRow[] {
    const rows = ids.map(id => ({ id, score: scores[id] ?? 0 })).sort((a, b) => b.score - a.score);
    let rank = 0;
    return rows.map((row, i) => {
        if (i === 0 || rows[i - 1].score !== row.score) rank = i + 1;
        return { ...row, rank };
    });
}
