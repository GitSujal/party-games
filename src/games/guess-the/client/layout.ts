/** Pure layout for a question's clues (kept apart from React so it can be unit-tested). */

export type Size = { w: number; h: number };
export type Row = { index: number; size: Size }[];

export interface FitOptions {
    /** Natural pixel height of each clue, when known. Stops small pictures being blown up. */
    naturalHeights?: (number | null)[];
    /** Device pixels per CSS pixel (a 4K TV is often 2). */
    pixelRatio?: number;
    /** Most a picture may be enlarged, in device pixels. */
    maxUpscale?: number;
}

export const MAX_UPSCALE = 2;

/**
 * Best justified layout for clues of the given shapes (width ÷ height) in a box.
 * Tries every way of splitting the clues into rows (in order), scales each arrangement to fit the box and
 * keeps the one that scores highest: covered area, nudged toward clues of similar size. Then no picture is
 * enlarged past `maxUpscale` device pixels per pixel; the whole group shrinks together and stays centred.
 */
export function fitClues(ratios: number[], boxW: number, boxH: number, gap: number, opts: FitOptions = {}): Row[] {
    const n = ratios.length;
    let best: { score: number; rows: Row[] } | null = null;
    // Bit i set = start a new row after clue i. 2^(n-1) splits, at most 16 for five clues.
    for (let mask = 0; mask < 1 << (n - 1); mask++) {
        const groups: number[][] = [[]];
        ratios.forEach((_, i) => {
            groups[groups.length - 1].push(i);
            if (i < n - 1 && mask & (1 << i)) groups.push([]);
        });
        // Natural row heights when each row exactly fills the box width.
        const heights = groups.map(g => (boxW - gap * (g.length - 1)) / g.reduce((s, i) => s + ratios[i], 0));
        const gaps = gap * (groups.length - 1);
        // Two candidates per split: every row justified to the full width (heights differ), or every row the
        // same height (neater when the rows hold different numbers of clues).
        const scale = Math.max(0.05, Math.min(1, (boxH - gaps) / heights.reduce((a, b) => a + b, 0)));
        const uniform = Math.max(0.05, Math.min((boxH - gaps) / groups.length, ...heights));
        for (const rowHeights of [heights.map(h => h * scale), heights.map(() => uniform)]) {
            const rows: Row[] = groups.map((g, r) => g.map(i => ({ index: i, size: { w: rowHeights[r] * ratios[i], h: rowHeights[r] } })));
            const areas = rows.flat().map(c => c.size.w * c.size.h);
            const total = areas.reduce((a, b) => a + b, 0);
            // A lone big picture beside tiny ones reads as inconsistent: lean toward even sizes (at most -30%).
            const balance = n > 1 ? 0.7 + 0.3 * Math.min(1, Math.min(...areas) / Math.max(...areas) / 0.5) : 1;
            // Break ties toward even rows (2+2 rather than 1+3), with the longer row first.
            const counts = groups.map(g => g.length);
            const tidy = 1 - 0.004 * (Math.max(...counts) - Math.min(...counts)) + (counts[0] >= counts[counts.length - 1] ? 0.001 : 0);
            const score = total * balance * tidy;
            if (!best || score > best.score) best = { score, rows };
        }
    }
    return capUpscale(best!.rows, opts);
}

function capUpscale(rows: Row[], { naturalHeights, pixelRatio = 1, maxUpscale = MAX_UPSCALE }: FitOptions): Row[] {
    if (!naturalHeights) return rows;
    let k = 1;
    for (const { index, size } of rows.flat()) {
        const natural = naturalHeights[index];
        if (natural) k = Math.min(k, (maxUpscale * natural) / (pixelRatio * size.h));
    }
    if (k >= 1) return rows;
    return rows.map(row => row.map(c => ({ index: c.index, size: { w: c.size.w * k, h: c.size.h * k } })));
}
