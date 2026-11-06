import type { CSSProperties } from 'react';
import type { Theme } from '../platform/sdk';

/** Text colour that stays readable on a given background hex. */
function readableOn(hex: string): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return '#111';
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111111' : '#ffffff';
}

/**
 * CSS variables for a game's theme. Every game shares the platform look; the theme
 * only sets the game's one colour (buttons, highlights, its cover tile).
 */
export function themeStyle(theme: Theme | undefined): CSSProperties {
    if (!theme) return {};
    return {
        '--pg-primary': theme.color,
        '--pg-on-primary': readableOn(theme.color),
    } as CSSProperties;
}
