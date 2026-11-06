/**
 * Per-room credentials in the browser.
 *
 * Written to both sessionStorage and localStorage. Reads prefer sessionStorage, so
 * two tabs in one browser can hold different players (handy for testing), while a
 * phone that reloads or reopens the tab still gets its seat back from localStorage.
 */
export interface HostSession {
    role: 'host';
    token: string;
    pin?: string;
}

export interface PlayerSession {
    role: 'player';
    token: string;
    playerId: string;
    name: string;
}

export type RoomSession = HostSession | PlayerSession;

const key = (code: string, role: RoomSession['role']) => `pg:${role}:${code}`;

function read(k: string): string | null {
    try {
        return sessionStorage.getItem(k) ?? localStorage.getItem(k);
    } catch {
        return null;
    }
}

function write(k: string, value: string | null): void {
    for (const store of [sessionStorage, localStorage]) {
        try {
            if (value === null) store.removeItem(k);
            else store.setItem(k, value);
        } catch {
            /* storage unavailable (private mode) */
        }
    }
}

export function getSession<R extends RoomSession['role']>(code: string, role: R): Extract<RoomSession, { role: R }> | null {
    const raw = read(key(code, role));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function saveSession(code: string, session: RoomSession): void {
    write(key(code, session.role), JSON.stringify(session));
    try {
        localStorage.setItem('pg:lastRoom', JSON.stringify({ code, role: session.role, at: Date.now() }));
    } catch {
        /* ignore */
    }
}

export function clearSession(code: string, role: RoomSession['role']): void {
    write(key(code, role), null);
}

export function lastRoom(): { code: string; role: RoomSession['role']; at: number } | null {
    try {
        const raw = localStorage.getItem('pg:lastRoom');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
