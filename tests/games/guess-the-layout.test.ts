import { describe, expect, it } from 'vitest';
import { MAX_UPSCALE, fitClues } from '../../src/games/guess-the/client/layout';
import { QUESTIONS } from '../../src/games/guess-the/server';
import dims from '../../src/games/guess-the/dims.json';
import { SHAPES, nearestShape, planSnap } from '../../scripts/guess-the-media.mjs';

const area = (rows: ReturnType<typeof fitClues>) => rows.flat().reduce((s, c) => s + c.size.w * c.size.h, 0);

describe('guess-the: clue layout', () => {
    it('keeps every clue inside the box, in order, with its own shape', () => {
        const ratios = [1, 4 / 3, 3 / 4, 16 / 9, 1];
        for (let n = 1; n <= 5; n++) {
            const rows = fitClues(ratios.slice(0, n), 980, 520, 12);
            const cells = rows.flat();
            expect(cells.map(c => c.index)).toEqual([...Array(n).keys()]);
            const height = rows.reduce((s, r) => s + r[0].size.h, 0) + 12 * (rows.length - 1);
            expect(height).toBeLessThanOrEqual(520.5);
            for (const row of rows) expect(row.reduce((s, c) => s + c.size.w, 0) + 12 * (row.length - 1)).toBeLessThanOrEqual(980.5);
            for (const c of cells) expect(c.size.w / c.size.h).toBeCloseTo(ratios[c.index], 5);
        }
    });

    it('fills the box height with a single square clue', () => {
        const [[cell]] = fitClues([1], 980, 520, 12);
        expect(cell.size.h).toBeCloseTo(520);
    });

    it('does not enlarge small pictures past the upscale cap', () => {
        const plain = fitClues([1], 980, 900, 12);
        expect(plain[0][0].size.h).toBeCloseTo(900);
        const capped = fitClues([1], 980, 900, 12, { naturalHeights: [256], pixelRatio: 1 });
        expect(capped[0][0].size.h).toBeCloseTo(256 * MAX_UPSCALE);
        // A 2x display allows only half as many CSS pixels.
        expect(fitClues([1], 980, 900, 12, { naturalHeights: [256], pixelRatio: 2 })[0][0].size.h).toBeCloseTo(256);
    });

    it('prefers even sizes over one large clue among tiny ones, but still covers most of the box', () => {
        const rows = fitClues([1, 1, 1, 1, 1], 980, 520, 12);
        const sizes = rows.flat().map(c => c.size.h);
        expect(Math.max(...sizes) / Math.min(...sizes)).toBeLessThan(1.5);
        expect(area(rows)).toBeGreaterThan(0.35 * 980 * 520);
    });
});

describe('guess-the: clue media', () => {
    it('snaps to the nearest canonical shape, cropping only when close', () => {
        expect(nearestShape(960, 720).shape).toBeCloseTo(4 / 3);
        expect(planSnap(512, 512)).toMatchObject({ action: 'keep', resize: false });
        expect(planSnap(1000, 960).action).toBe('crop');
        expect(planSnap(960, 472).action).toBe('pad');
        expect(planSnap(3000, 2250)).toMatchObject({ shape: 4 / 3, resize: true });
    });

    it('records the size of every local clue, and every local clue is on a canonical shape', () => {
        for (const q of Object.values(QUESTIONS)) {
            for (const src of q.images.filter(s => !/^(https?:)?\//.test(s))) {
                const d = (dims as Record<string, number[]>)[src];
                expect(d, `${src} missing from dims.json (run node scripts/guess-the-media.mjs dims)`).toBeTruthy();
                if (/\.(svg|mp4|webm)$/i.test(src)) continue;
                // Pictures are snapped within a pixel of rounding.
                const { off } = nearestShape(d[0], d[1]);
                expect(off, `${src} is ${d[0]}x${d[1]}; run node scripts/guess-the-media.mjs normalize --write`).toBeLessThan(1.02);
                expect(Math.max(...d)).toBeLessThanOrEqual(1024);
            }
        }
        expect(SHAPES).toHaveLength(4);
    });
});
