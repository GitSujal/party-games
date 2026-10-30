import { useState, type ReactNode } from 'react';
import type { Player } from '../../platform/sdk';

/** Photo, or the player's initial on a soft tint of the game colour (also if the photo fails to load). */
export function Avatar({ name, src, size = 36, offline }: { name: string; src?: string | null; size?: number; offline?: boolean }) {
    const [failed, setFailed] = useState<string | null>(null);
    return (
        <span className={`pg-avatar ${offline ? 'pg-avatar--offline' : ''}`} style={{ ['--size' as string]: `${size}px` }} aria-hidden>
            {src && failed !== src ? <img src={src} alt="" onError={() => setFailed(src)} /> : name.trim().charAt(0).toUpperCase()}
        </span>
    );
}

/** Avatar + name, for rosters and lists. */
export function PlayerChip({ player, out, trailing, size = 32 }: { player: Pick<Player, 'name' | 'photoUrl' | 'connected'>; out?: boolean; trailing?: ReactNode; size?: number }) {
    return (
        <span className={`pg-player ${out ? 'pg-player--out' : ''}`}>
            <Avatar name={player.name} src={player.photoUrl} size={size} offline={!player.connected} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
            {trailing}
        </span>
    );
}
