import type { CreateRoomResponse, JoinResponse, ResumeResponse } from '../protocol';
import type { Settings } from '../sdk';

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data: { error?: string } & T;
    try {
        data = await res.json();
    } catch {
        throw new Error(`Server error (${res.status})`);
    }
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data;
}

export const api = {
    createRoom: (gameId: string, settings: Settings) =>
        request<CreateRoomResponse>('POST', '/api/rooms', { gameId, settings }),

    roomInfo: (code: string) =>
        request<{ gameId: string; status: string; players: number; wantsPhoto: boolean }>('GET', `/api/rooms/${code}`),

    join: (code: string, name: string, photo?: string) =>
        request<JoinResponse>('POST', `/api/rooms/${code}/join`, { name, photo }),

    resume: (code: string, pin: string) => request<ResumeResponse>('POST', `/api/rooms/${code}/resume`, { pin }),
};

export function joinUrl(code: string): string {
    return `${window.location.origin}/join/${code}`;
}
