/**
 * Client-side helpers. Only public content is imported here (manifest + storyline);
 * characters and clues arrive through the server's per-viewer view.
 */
import type { Player } from '../../../platform/sdk';
import manifestJson from '../content/manifest.json';
import storylineJson from '../content/storyline.json';
import type { Manifest, PhaseConfig } from '../content';
import type { MomoView } from '../server';

export type View = MomoView;
export type CastEntry = View['cast'][number];

export const manifest = manifestJson as Manifest;
export const storyline = storylineJson as Record<string, string>;
export const asset = (path: string | undefined) => (path ? `/games/momo-massacre/${path}` : undefined);

export function phaseConfig(id: string): PhaseConfig | undefined {
    return manifest.phases.find(p => p.id === id);
}

/** Suspects in carousel/investigation order: everyone cast except excluded characters. */
export function suspects(game: View, exclude: string[] = [manifest.victimCharacterId]): CastEntry[] {
    return game.cast.filter(c => !exclude.includes(c.character.id)).sort((a, b) => Number(a.character.id) - Number(b.character.id));
}

/** Best image for a cast member: AI portrait → their selfie → the character art. */
export function portraitOf(entry: CastEntry | undefined, players: Player[]): string | null {
    if (!entry) return null;
    if (entry.portrait?.status === 'ready' && entry.portrait.url) return entry.portrait.url;
    return players.find(p => p.id === entry.playerId)?.photoUrl ?? entry.character.image;
}

export function playerName(players: Player[], id: string | null | undefined): string {
    return players.find(p => p.id === id)?.name ?? 'someone';
}
