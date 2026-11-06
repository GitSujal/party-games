/**
 * useRoom — the one hook every game screen is built on.
 *
 *   const { status, room, game, send } = useRoom(code, token);
 *   await send('vote', { targetId });   // resolves on ack, throws on error
 *
 * Keeps a WebSocket to the room open, reconnects with backoff, and exposes the
 * latest snapshot. Ephemeral events are delivered to `onEvent`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CLOSE, type ServerMessage } from '../protocol';
import type { GameEvent, RoomView } from '../sdk';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'kicked' | 'unauthorized' | 'closed';

export type SendAction = (type: string, payload?: unknown) => Promise<void>;

interface Pending {
    resolve: () => void;
    reject: (err: Error) => void;
}

const MAX_BACKOFF_MS = 10_000;

export function useRoom<G = unknown>(code: string, token: string | null, onEvent?: (event: GameEvent) => void) {
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [room, setRoom] = useState<RoomView | null>(null);
    const [game, setGame] = useState<G | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const pending = useRef(new Map<number, Pending>());
    const nextId = useRef(1);
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    useEffect(() => {
        if (!token) {
            setStatus('unauthorized');
            return;
        }
        let stopped = false;
        let attempt = 0;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;

        const connect = () => {
            const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const socket = new WebSocket(`${proto}://${window.location.host}/api/rooms/${code}/ws?token=${encodeURIComponent(token)}`);
            ws.current = socket;

            socket.onopen = () => {
                attempt = 0;
                setStatus('open');
            };

            socket.onmessage = e => {
                const msg = JSON.parse(e.data) as ServerMessage;
                switch (msg.t) {
                    case 'state':
                        setRoom(msg.room);
                        setGame(msg.game as G);
                        break;
                    case 'ack':
                        pending.current.get(msg.id)?.resolve();
                        pending.current.delete(msg.id);
                        break;
                    case 'error':
                        if (msg.id !== undefined) {
                            pending.current.get(msg.id)?.reject(new Error(msg.message));
                            pending.current.delete(msg.id);
                        }
                        break;
                    case 'event':
                        onEventRef.current?.(msg.event);
                        break;
                    case 'kicked':
                        stopped = true;
                        setStatus('kicked');
                        break;
                }
            };

            socket.onclose = e => {
                for (const p of pending.current.values()) p.reject(new Error('Connection lost'));
                pending.current.clear();
                if (stopped) return;
                if (e.code === CLOSE.kicked) return setStatus('kicked');
                if (e.code === CLOSE.unauthorized) return setStatus('unauthorized');
                if (e.code === CLOSE.roomClosed) return setStatus('closed');
                setStatus('reconnecting');
                const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt++);
                retryTimer = setTimeout(connect, delay);
            };
        };

        // Reconnect immediately when a phone comes back from sleep.
        const onVisible = () => {
            if (document.visibilityState === 'visible' && ws.current?.readyState === WebSocket.CLOSED && !stopped) {
                clearTimeout(retryTimer);
                connect();
            }
        };
        document.addEventListener('visibilitychange', onVisible);

        setStatus('connecting');
        connect();
        return () => {
            stopped = true;
            clearTimeout(retryTimer);
            document.removeEventListener('visibilitychange', onVisible);
            ws.current?.close();
        };
    }, [code, token]);

    const send = useCallback<SendAction>((type, payload) => {
        const socket = ws.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Not connected — retrying…'));
        const id = nextId.current++;
        return new Promise<void>((resolve, reject) => {
            pending.current.set(id, { resolve, reject });
            socket.send(JSON.stringify({ t: 'action', id, type, payload }));
        });
    }, []);

    return { status, room, game, send };
}
