/**
 * Server-authoritative countdowns. The server keeps a Countdown in game state and
 * calls ctx.timers.set(id, ms); clients render the remaining time from endsAt.
 */
export interface Countdown {
    id: string;
    endsAt: number;
    durationMs: number;
}

export function startCountdown(id: string, durationMs: number, now: number): Countdown {
    return { id, endsAt: now + durationMs, durationMs };
}

export function remainingMs(countdown: Pick<Countdown, 'endsAt'> | null | undefined, now: number): number {
    return countdown ? Math.max(0, countdown.endsAt - now) : 0;
}

export function formatClock(ms: number): string {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
