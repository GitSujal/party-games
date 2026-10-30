/**
 * Momo Massacre content. SERVER-ONLY for characters and clues (they hold secrets):
 * client code may import manifest.json and storyline.json directly, never this file.
 */
import manifestJson from './content/manifest.json';
import storylineJson from './content/storyline.json';
import cluesJson from './content/clues.json';
import solution from './content/solution.json';
import hostGuide from './content/host.md?raw';

export interface Character {
    id: string;
    name: string;
    role: string;
    isOptional: boolean;
    description: string;
    about: string;
    secret: string;
    action: string;
    alibi: string;
    goal: string;
    tips?: string;
    icon: string;
    image: string | null;
}

export interface Clue {
    id: number;
    name: string;
    content: string;
    trigger: string;
    /** "all" or a character name. */
    revealed_to: string;
}

export interface PhaseConfig {
    id: string;
    type: 'lobby' | 'cinematic' | 'toast' | 'announcement' | 'carousel' | 'investigation' | 'finale';
    next?: string;
    title?: string;
    headline?: string;
    subtext?: string;
    instruction?: string;
    background?: string;
    audio?: string;
    textKey?: string;
    victimImage?: string;
    victimName?: string;
    toastImage?: string;
    excludeCharacterIds?: string[];
    steps?: { id: string; title: string; audio?: string; textKey?: string; instruction?: string }[];
}

export interface Manifest {
    name: string;
    victimCharacterId: string;
    phases: PhaseConfig[];
}

const characterFiles = import.meta.glob<Character>('./content/characters/*.json', { eager: true, import: 'default' });

export const characters: Character[] = Object.values(characterFiles).sort((a, b) => Number(a.id) - Number(b.id));
export const clues: Clue[] = cluesJson.clues;
export const manifest = manifestJson as Manifest;
/** Who did it. Server-only: manifest.json is shipped to browsers, this is not. */
export const killerCharacterId: string = solution.killerCharacterId;
export const storyline = storylineJson as Record<string, string>;
export { hostGuide };

export const ASSET_BASE = '/games/momo-massacre/';

export function characterById(id: string | null | undefined): Character | undefined {
    return characters.find(c => c.id === id);
}

export function phaseById(id: string): PhaseConfig | undefined {
    return manifest.phases.find(p => p.id === id);
}
