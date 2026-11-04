import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Player } from '../../../platform/sdk';
import { fireConfetti, useGameEvent, useToast } from '../../../ui';
import type { View } from '../server';
import { fitClues, type Size } from './layout';

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

export { fitClues } from './layout';

/** One clue filling the screen. Tap anywhere (or press Escape) to go back. */
function Fullscreen({ src, onClose }: { src: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return createPortal(
        <div className="guess-zoom" onClick={onClose} role="dialog" aria-label="Clue, tap to close">
            {VIDEO.test(src) ? <video src={src} autoPlay muted loop playsInline disablePictureInPicture /> : <img src={src} alt="Clue" draggable={false} />}
        </div>,
        document.body
    );
}

/** The 1–5 clues (pictures or short clips), each keeping its own shape and sized to the space. */
export function Clues({ images, shapes, compact }: { images: string[]; shapes?: ([number, number] | null)[]; compact?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<Size>({ w: 0, h: 0 });
    // Natural size of each clue. The server sends it with the question (so the first paint is final);
    // anything it didn't know (external URLs) is learned when the clue loads.
    const [learned, setLearned] = useState<Record<string, [number, number]>>({});
    const natural = (src: string, i: number) => shapes?.[i] ?? learned[src] ?? null;
    const gap = compact ? 8 : GAP;
    const [zoom, setZoom] = useState<string | null>(null);

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

    const rows = useMemo(() => {
        if (!box.w || !box.h) return null;
        const sizes = images.map((src, i) => shapes?.[i] ?? learned[src] ?? null);
        return fitClues(
            sizes.map(sz => (sz ? sz[0] / sz[1] : DEFAULT_RATIO)),
            box.w,
            box.h,
            gap,
            // Vector clues scale freely; only pictures and clips have a pixel size to protect.
            { naturalHeights: sizes.map((sz, i) => (sz && !/\.svg$/i.test(images[i]) ? sz[1] : null)), pixelRatio: window.devicePixelRatio || 1 }
        );
    }, [images, shapes, learned, box, gap]);

    const learn = (src: string, w: number, h: number) => {
        if (!w || !h) return;
        setLearned(prev => (prev[src]?.[0] === w && prev[src]?.[1] === h ? prev : { ...prev, [src]: [w, h] }));
    };
    const media = (src: string, i: number, size?: Size) => {
        const known = natural(src, i);
        // aspect-ratio keeps the slot the right shape even before the file arrives.
        const style = size ? { width: size.w, height: size.h } : known ? { aspectRatio: `${known[0]} / ${known[1]}` } : undefined;
        return VIDEO.test(src) ? (
            // Short action clips: silent, looping, inline (muted autoplay works on every phone).
            <video key={src} src={src} style={style} aria-label={`Clue ${i + 1}`} autoPlay muted loop playsInline preload="auto" disablePictureInPicture onClick={() => setZoom(src)}
                onLoadedMetadata={e => learn(src, e.currentTarget.videoWidth, e.currentTarget.videoHeight)} />
        ) : (
            <img key={src} src={src} style={style} alt={`Clue ${i + 1}`} draggable={false} onClick={() => setZoom(src)}
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
            {zoom && <Fullscreen src={zoom} onClose={() => setZoom(null)} />}
        </div>
    );
}
