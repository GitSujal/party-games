import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { GameMeta } from '../../platform/sdk';

export function SiteHeader({ children }: { children?: ReactNode }) {
    return (
        <header className="site-header">
            <Link to="/" className="site-logo">
                Party Games
            </Link>
            <nav className="site-nav">{children}</nav>
        </header>
    );
}

/** Flat colour tile with the game's mark (or initial). */
export function GameTile({ game, size }: { game: GameMeta; size?: number }) {
    const small = size !== undefined;
    return (
        <div
            className="game-tile"
            style={{
                background: game.theme.color,
                ...(small ? { width: size, height: size, aspectRatio: 'auto', borderRadius: Math.round(size / 5) } : {}),
            }}
            aria-hidden
        >
            {game.mark ? (
                <img src={game.mark} alt="" style={{ width: small ? '50%' : '30%' }} />
            ) : (
                <span style={{ fontSize: small ? size / 2.4 : 72 }}>{game.name.charAt(0)}</span>
            )}
        </div>
    );
}
