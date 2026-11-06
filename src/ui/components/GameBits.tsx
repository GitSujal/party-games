/** Game-building blocks: countdowns, reveal cards, flip cards, markdown, confetti. */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { Eye, EyeOff } from 'lucide-react';
import { formatClock, remainingMs, type Countdown as CountdownState } from '../../platform/mechanics/timer';

// ---------- Countdown ---------------------------------------------------------

export function useRemaining(countdown: Pick<CountdownState, 'endsAt'> | null | undefined): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!countdown) return;
        const t = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(t);
    }, [countdown]);
    return remainingMs(countdown, now);
}

/** Big clock for a server countdown. Turns red in the last `lowAtMs`. */
export function Countdown({ countdown, lowAtMs = 30_000, style }: { countdown: CountdownState | null; lowAtMs?: number; style?: CSSProperties }) {
    const ms = useRemaining(countdown);
    if (!countdown) return null;
    return (
        <div className={`pg-timer ${ms <= lowAtMs ? 'pg-timer--low' : ''}`} style={style} aria-live="off">
            {formatClock(ms)}
        </div>
    );
}

// ---------- Reveal card ---------------------------------------------------------

/**
 * Tap-to-reveal secret. Every role should render through the same card with the
 * same layout so nobody can tell roles apart by glancing at a screen.
 */
export function RevealCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
    const [shown, setShown] = useState(false);
    return (
        <button type="button" className="pg-reveal" onClick={() => setShown(s => !s)} aria-pressed={shown}>
            {shown ? (
                <>
                    <span className="pg-reveal__label">{label}</span>
                    <span className="pg-reveal__value">{value}</span>
                    {hint && <span className="pg-label-sm">{hint}</span>}
                    <EyeOff size={18} color="var(--pg-faint)" aria-hidden style={{ marginTop: 8 }} />
                </>
            ) : (
                <>
                    <Eye size={28} strokeWidth={1.5} aria-hidden />
                    <span className="pg-reveal__prompt">Tap to reveal</span>
                </>
            )}
        </button>
    );
}

// ---------- Flip card -----------------------------------------------------------

export function FlipCard({ front, back, height = 420, frontStyle, backStyle }: { front: ReactNode; back: ReactNode; height?: number; frontStyle?: CSSProperties; backStyle?: CSSProperties }) {
    const [flipped, setFlipped] = useState(false);
    return (
        <div
            className={`pg-flip ${flipped ? 'pg-flip--flipped' : ''}`}
            style={{ ['--flip-h' as string]: `${height}px` }}
            onClick={() => setFlipped(f => !f)}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setFlipped(f => !f)}
        >
            <div className="pg-flip__inner">
                <div className="pg-flip__face pg-flip__front" style={frontStyle}>
                    {front}
                </div>
                <div className="pg-flip__face pg-flip__back" style={backStyle}>
                    {back}
                </div>
            </div>
        </div>
    );
}

// ---------- Markdown -----------------------------------------------------------

/** Safe markdown (no raw HTML). */
export function Markdown({ children, style }: { children: string | null | undefined; style?: CSSProperties }) {
    if (!children) return null;
    return (
        <div className="pg-md" style={style}>
            <ReactMarkdown>{children}</ReactMarkdown>
        </div>
    );
}

// ---------- Confetti -----------------------------------------------------------

export function fireConfetti(durationMs = 2500): void {
    const css = getComputedStyle(document.documentElement);
    const colors = [css.getPropertyValue('--pg-primary').trim() || '#111111', '#111111', '#d6d5d0'];
    const end = Date.now() + durationMs;
    const frame = () => {
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
}
