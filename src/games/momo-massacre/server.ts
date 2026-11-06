/**
 * The Momo Massacre — server logic.
 *
 * Narrative phases come from content/manifest.json and are driven by the host.
 * Characters are cast in the lobby (manually or auto); each player's view carries
 * only their own character's secrets, and private clues only reach their target.
 */
import { z } from 'zod';
import { GameError, defineAction, defineServer, type GameContext, type Viewer } from '../../platform/sdk';
import { ASSET_BASE, characterById, characters, clues, hostGuide, killerCharacterId, manifest, phaseById, type Character } from './content';

type MomoSettings = { aiPortraits: boolean };
type Ctx = GameContext<MomoSettings>;

export interface Portrait {
    characterId: string;
    status: 'generating' | 'ready' | 'failed';
    url: string | null;
}

export interface MomoState {
    /** Manifest phase id. LOBBY until the host starts. */
    phase: string;
    /** playerId -> characterId */
    cast: Record<string, string>;
    revealedClues: number[];
    /** Index into the current toast phase's steps. */
    toastStep: number;
    /** Index into the introductions carousel. */
    suspectIndex: number;
    portraits: Record<string, Portrait>;
}

const LOBBY = manifest.phases[0].id;
const FIRST_PHASE = manifest.phases[0].next!;

function publicCharacter(c: Character) {
    return {
        id: c.id,
        name: c.name,
        description: c.description,
        about: c.about,
        icon: c.icon,
        image: c.image ? `${ASSET_BASE}characters/${c.image}` : null,
        isVictim: c.id === manifest.victimCharacterId,
    };
}
export type PublicCharacter = ReturnType<typeof publicCharacter>;

function castCharacter(state: MomoState, playerId: string, characterId: string | null, ctx: Ctx): void {
    if (!ctx.players.some(p => p.id === playerId)) throw new GameError('Player not found');
    if (characterId === null) {
        delete state.cast[playerId];
        delete state.portraits[playerId];
        return;
    }
    if (!characterById(characterId)) throw new GameError('Unknown character');
    const holder = Object.entries(state.cast).find(([pid, cid]) => cid === characterId && pid !== playerId);
    if (holder) throw new GameError('That character is already cast');

    state.cast[playerId] = characterId;
    requestPortrait(state, playerId, ctx);
}

const PORTRAIT_PROMPT = `You are a cinematic portrait engine. Merge the person in the reference photo with the fictional character described below into one photorealistic murder-mystery film still.

Face identity is immutable: keep the person's facial geometry, bone structure, eyes, nose, jawline, skin texture, age, ethnicity and gender presentation exactly. Do not beautify or genericise. They must be instantly recognisable.

Style: cinematic, photorealistic, dramatic Rembrandt lighting, visible skin and fabric texture, subtle film grain. Upper-torso portrait, shallow depth of field, atmospheric background that fits the character. Lighting on the face must match the scene.

Never: cartoon, anime or painterly styles; plastic-smooth skin; mismatched lighting; anything hinting at who the killer is.`;

function requestPortrait(state: MomoState, playerId: string, ctx: Ctx): void {
    const characterId = state.cast[playerId];
    const character = characterById(characterId);
    const photoKey = ctx.photoKeyOf(playerId);
    if (!character || !photoKey || !ctx.settings.aiPortraits || !ctx.media.imageGeneration) return;
    if (state.portraits[playerId]?.characterId === characterId && state.portraits[playerId].status !== 'failed') return;

    state.portraits[playerId] = { characterId, status: 'generating', url: null };
    const prompt = `${PORTRAIT_PROMPT}\n\nCharacter: ${character.name}\nDescription: ${character.description}`;
    const outKey = `${photoKey.replace(/photo$/, '')}portrait-${characterId}`;

    ctx.runAsync<MomoState>(async () => {
        try {
            const key = await ctx.media.generateFromPhoto({ photoKey, prompt, outKey });
            return s => {
                if (s.portraits[playerId]?.characterId === characterId) {
                    s.portraits[playerId] = { characterId, status: 'ready', url: ctx.media.url(key) };
                }
            };
        } catch (err) {
            console.error(`Portrait for ${playerId} failed`, err);
            return s => {
                if (s.portraits[playerId]?.characterId === characterId) s.portraits[playerId].status = 'failed';
            };
        }
    });
}

/** Required characters first (victim, killer, non-optional), then optional ones, in order. */
function autoCast(state: MomoState, ctx: Ctx): void {
    const taken = new Set(Object.values(state.cast));
    const free = [
        ...characters.filter(c => !c.isOptional && !taken.has(c.id)),
        ...ctx.random.shuffle(characters.filter(c => c.isOptional && !taken.has(c.id))),
    ];
    for (const player of ctx.random.shuffle(ctx.players)) {
        if (state.cast[player.id]) continue;
        const next = free.shift();
        if (!next) throw new GameError('Not enough characters for everyone');
        castCharacter(state, player.id, next.id, ctx);
    }
}

function clueView(state: MomoState, viewer: Viewer) {
    const myCharacter = viewer.playerId ? characterById(state.cast[viewer.playerId]) : undefined;
    return clues
        .filter(c => state.revealedClues.includes(c.id))
        .map(c => {
            const isPublic = !c.revealed_to || c.revealed_to === 'all';
            const visible = isPublic || myCharacter?.name === c.revealed_to;
            const recipient = isPublic
                ? null
                : Object.entries(state.cast).find(([, cid]) => characterById(cid)?.name === c.revealed_to)?.[0] ?? null;
            return { id: c.id, name: c.name, audience: isPublic ? 'all' : c.revealed_to, recipient, content: visible ? c.content : null };
        });
}

function view(state: MomoState, viewer: Viewer) {
    const castList = Object.entries(state.cast).map(([playerId, characterId]) => ({
        playerId,
        character: publicCharacter(characterById(characterId)!),
        portrait: state.portraits[playerId] ?? null,
    }));

    const base = {
        phase: state.phase,
        toastStep: state.toastStep,
        suspectIndex: state.suspectIndex,
        cast: castList,
        clues: clueView(state, viewer),
    };

    if (viewer.role === 'host') {
        return {
            ...base,
            host: {
                characters: characters.map(publicCharacter),
                clueList: clues.map(c => ({
                    id: c.id,
                    name: c.name,
                    audience: !c.revealed_to || c.revealed_to === 'all' ? 'all' : c.revealed_to,
                    revealed: state.revealedClues.includes(c.id),
                })),
                guide: hostGuide,
            },
            me: null,
        };
    }

    const mine = characterById(state.cast[viewer.playerId!]);
    return {
        ...base,
        host: null,
        // Private details only after the game starts, and only your own.
        me:
            mine && state.phase !== LOBBY
                ? {
                      ...publicCharacter(mine),
                      role: mine.role,
                      secret: mine.secret,
                      action: mine.action,
                      alibi: mine.alibi,
                      goal: mine.goal,
                      tips: mine.tips ?? null,
                      isKiller: mine.id === killerCharacterId,
                  }
                : null,
    };
}

export type MomoView = ReturnType<typeof view>;

const assign = z.object({ playerId: z.string(), characterId: z.string().nullable() });
const phase = z.object({ phase: z.string() });
const index = z.object({ index: z.number().int().min(0) });
const clue = z.object({ clueId: z.number().int() });
const player = z.object({ playerId: z.string() });

export default defineServer<MomoState, MomoSettings>({
    setup: () => ({ phase: LOBBY, cast: {}, revealedClues: [], toastStep: 0, suspectIndex: 0, portraits: {} }),

    start(state, ctx) {
        const uncast = ctx.players.filter(p => !state.cast[p.id]);
        if (uncast.length) return `Cast a character for ${uncast.map(p => p.name).join(', ')} first (or use Auto-cast)`;
        state.phase = FIRST_PHASE;
        state.toastStep = 0;
        state.suspectIndex = 0;
    },

    actions: {
        assignCharacter: defineAction<MomoState, MomoSettings, z.infer<typeof assign>>({
            by: 'host',
            schema: assign,
            handle: (state, { playerId, characterId }, ctx) => castCharacter(state, playerId, characterId, ctx),
        }),

        autoCast: defineAction<MomoState, MomoSettings>({
            by: 'host',
            handle: (state, _p, ctx) => autoCast(state, ctx),
        }),

        retryPortrait: defineAction<MomoState, MomoSettings, z.infer<typeof player>>({
            by: 'host',
            schema: player,
            handle(state, { playerId }, ctx) {
                if (state.portraits[playerId]) state.portraits[playerId].status = 'failed';
                requestPortrait(state, playerId, ctx);
            },
        }),

        setPhase: defineAction<MomoState, MomoSettings, z.infer<typeof phase>>({
            by: 'host',
            schema: phase,
            handle(state, { phase: id }) {
                if (!phaseById(id) || id === LOBBY) throw new GameError('Unknown phase');
                state.phase = id;
                state.toastStep = 0;
                state.suspectIndex = 0;
            },
        }),

        setToastStep: defineAction<MomoState, MomoSettings, z.infer<typeof index>>({
            by: 'host',
            schema: index,
            handle(state, { index: i }) {
                const steps = phaseById(state.phase)?.steps ?? [];
                if (i >= steps.length) throw new GameError('No such step');
                state.toastStep = i;
            },
        }),

        setSuspectIndex: defineAction<MomoState, MomoSettings, z.infer<typeof index>>({
            by: 'host',
            schema: index,
            handle(state, { index: i }) {
                if (i >= Object.keys(state.cast).length) throw new GameError('No such suspect');
                state.suspectIndex = i;
            },
        }),

        revealClue: defineAction<MomoState, MomoSettings, z.infer<typeof clue>>({
            by: 'host',
            schema: clue,
            handle(state, { clueId }, ctx) {
                if (!clues.some(c => c.id === clueId)) throw new GameError('Unknown clue');
                if (!state.revealedClues.includes(clueId)) state.revealedClues.push(clueId);
                ctx.emit({ type: 'clue', clueId });
            },
        }),
    },

    onPlayerJoin(state, p, ctx) {
        // Late arrivals get a free character straight away so they can play.
        try {
            const taken = new Set(Object.values(state.cast));
            const free = characters.find(c => c.isOptional && !taken.has(c.id));
            if (free) castCharacter(state, p.id, free.id, ctx);
        } catch {
            /* no characters left: they spectate */
        }
    },

    onPlayerLeave(state, playerId) {
        delete state.cast[playerId];
        delete state.portraits[playerId];
    },

    view,
});
