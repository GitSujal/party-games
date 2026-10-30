import { useEffect, useState } from 'react';
import { loadClient } from '../games/registry.client';
import type { GameClient } from '../platform/client/types';
import type { Theme } from '../platform/sdk';
import { themeStyle } from '../ui/theme';

/** Lazily load a game's client module. */
export function useGameClient(gameId: string | null | undefined): { client: GameClient | null; error: string | null } {
    const [state, setState] = useState<{ id: string; client: GameClient | null; error: string | null } | null>(null);
    useEffect(() => {
        if (!gameId) return;
        let cancelled = false;
        const loading = loadClient(gameId);
        if (!loading) {
            setState({ id: gameId, client: null, error: 'This game is not available' });
            return;
        }
        loading
            .then(client => !cancelled && setState({ id: gameId, client, error: null }))
            .catch(() => !cancelled && setState({ id: gameId, client: null, error: 'Failed to load the game. Check your connection.' }));
        return () => {
            cancelled = true;
        };
    }, [gameId]);
    return state && state.id === gameId ? state : { client: null, error: null };
}

/** Apply a game's theme to the whole document while a screen is mounted. */
export function useDocumentTheme(theme: Theme | undefined): void {
    useEffect(() => {
        const vars = themeStyle(theme) as Record<string, string>;
        const root = document.documentElement;
        for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
        return () => {
            for (const k of Object.keys(vars)) root.style.removeProperty(k);
        };
    }, [theme]);
}

export function useTitle(title: string): void {
    useEffect(() => {
        document.title = title ? `${title} · Party Games` : 'Party Games';
    }, [title]);
}
