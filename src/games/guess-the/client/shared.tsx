import { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '../../../platform/sdk';
import { fireConfetti, useGameEvent, useToast } from '../../../ui';
import type { View } from '../server';

export type { View };

export const nameOf = (players: Player[], id: string | null | undefined) => players.find(p => p.id === id)?.name ?? 'Left the game';

export function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Shared reactions to server events, for both host and phones. */
export function useGuessEvents(): void {
    const toast = useToast();
    useGameEvent('confetti', () => fireConfetti());
    useGameEvent('skipped', () => toast('The host skipped that one. New question.'));
}

const VIDEO = /\.(mp4|webm)$/i;
const GAP = 12;
const DEFAULT_RATIO = 4 / 3;

type Size = { w: number; h: number };
type Row = { index: number; size: Size }[];

/**
 * Best justified layout for clues of the given shapes (width ÷ height) in a box.
 * Tries every way of splitting the clues into rows, scales each to fit the box, and keeps
 * the arrangement that uses the most screen area. Rows keep the clues in order.
 */
export function fitClues(ratios: number[], boxW: number, boxH: number, gap: number): Row[] {
    const n = ratios.length;
    let best: { area: number; rows: Row[] } | null = null;
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
        const scale = Math.max(0.05, Math.min(1, (boxH - gaps) / heights.reduce((a, b) => a + b, 0)));
        const rows: Row[] = groups.map((g, r) => {
            const h = heights[r] * scale;
            return g.map(i => ({ index: i, size: { w: h * ratios[i], h } }));
        });
        const area = rows.flat().reduce((s, c) => s + c.size.w * c.size.h, 0);
        if (!best || area > best.area) best = { area, rows };
    }
    return best!.rows;
}

/** The 1–5 clues (pictures or short clips), each keeping its own shape and sized to the space. */
export function Clues({ images, compact }: { images: string[]; compact?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<Size>({ w: 0, h: 0 });
    // Natural shape of each clue, learned when it loads (clips report their video size).
    const [ratioBy, setRatioBy] = useState<Record<string, number>>({});
    const gap = compact ? 8 : GAP;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // Phones: the clues take a share of the viewport height. TV: the space the layout gives them.
        const measure = () => setBox({ w: el.clientWidth, h: compact ? Math.round(window.innerHeight * 0.55) : el.clientHeight });
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [compact]);

    const rows = useMemo(
        () => (box.w && box.h ? fitClues(images.map(src => ratioBy[src] ?? DEFAULT_RATIO), box.w, box.h, gap) : null),
        [images, ratioBy, box, gap]
    );

    const learn = (src: string, w: number, h: number) => {
        if (!w || !h) return;
        setRatioBy(prev => (prev[src] === w / h ? prev : { ...prev, [src]: w / h }));
    };
    const media = (src: string, i: number, size?: Size) => {
        const style = size ? { width: size.w, height: size.h } : undefined;
        return VIDEO.test(src) ? (
            // Short action clips: silent, looping, inline (muted autoplay works on every phone).
            <video key={src} src={src} style={style} aria-label={`Clue ${i + 1}`} autoPlay muted loop playsInline preload="auto" disablePictureInPicture
                onLoadedMetadata={e => learn(src, e.currentTarget.videoWidth, e.currentTarget.videoHeight)} />
        ) : (
            <img key={src} src={src} style={style} alt={`Clue ${i + 1}`} draggable={false}
                onLoad={e => learn(src, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} />
        );
    };

    return (
        <div ref={ref} className={`guess-clues${compact ? ' guess-clues--compact' : ''}`} style={{ gap }}>
            {rows
                ? rows.map((row, r) => (
                      <div key={r} className="guess-clues__row" style={{ gap, height: row[0].size.h }}>
                          {row.map(({ index, size }) => media(images[index], index, size))}
                      </div>
                  ))
                : // Before the box is measured: a simple grid, so nothing jumps on first paint.
                  images.map((src, i) => media(src, i))}
        </div>
    );
}
