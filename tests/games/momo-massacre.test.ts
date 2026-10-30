import { describe, expect, it } from 'vitest';
import server from '../../src/games/momo-massacre/server';
import { characters, clues, killerCharacterId, manifest } from '../../src/games/momo-massacre/content';
import { HOST, as, harness, players } from '../helpers';

const roster = players('Ann', 'Ben', 'Cat', 'Dan', 'Eve');

function cast(seed = 1) {
    const h = harness(server, roster, { aiPortraits: true }, seed);
    h.act('autoCast', HOST);
    return h;
}

describe('momo: content', () => {
    it('loads every character file and both special roles exist', () => {
        expect(characters.length).toBeGreaterThanOrEqual(14);
        expect(characters.some(c => c.id === manifest.victimCharacterId)).toBe(true);
        expect(characters.some(c => c.id === killerCharacterId)).toBe(true);
    });
});

describe('momo: casting', () => {
    it('auto-cast fills the victim and killer first', () => {
        const h = cast();
        const ids = Object.values(h.state.cast);
        expect(ids).toHaveLength(5);
        expect(ids).toContain(manifest.victimCharacterId);
        expect(ids).toContain(killerCharacterId);
        expect(new Set(ids).size).toBe(5);
    });

    it("the killer isn't always the same seat", () => {
        const seats = new Set(
            [1, 2, 3, 4, 5, 6, 7, 8].map(seed => {
                const h = cast(seed);
                return Object.entries(h.state.cast).find(([, c]) => c === killerCharacterId)![0];
            })
        );
        expect(seats.size).toBeGreaterThan(1);
    });

    it('rejects double-casting a character', () => {
        const h = harness(server, roster, { aiPortraits: false });
        h.act('assignCharacter', HOST, { playerId: 'p1', characterId: '3' });
        expect(() => h.act('assignCharacter', HOST, { playerId: 'p2', characterId: '3' })).toThrow(/already cast/);
    });

    it('cannot start until everyone is cast', () => {
        const h = harness(server, roster, { aiPortraits: false });
        expect(() => h.start()).toThrow(/Cast a character/);
        h.act('autoCast', HOST);
        h.start();
        expect(h.state.phase).toBe(manifest.phases[0].next);
    });
});

describe('momo: secrecy', () => {
    it('each player sees only their own secrets, and only after the start', () => {
        const h = cast();
        expect(h.view(as('p1')).me).toBeNull();
        h.start();

        const secrets = characters.map(c => c.secret);
        for (const p of roster) {
            const view = h.view(as(p.id));
            const mine = characters.find(c => c.id === h.state.cast[p.id])!;
            expect(view.me.secret).toBe(mine.secret);
            const json = JSON.stringify(view);
            for (const s of secrets) if (s !== mine.secret) expect(json.includes(s)).toBe(false);
        }
        const hostJson = JSON.stringify(h.view(HOST));
        for (const s of secrets) expect(hostJson.includes(s)).toBe(false);
    });

    it('only the killer is told they are the killer, and roles never leak', () => {
        const h = cast();
        h.start();
        const flags = roster.map(p => h.view(as(p.id)).me.isKiller);
        expect(flags.filter(Boolean)).toHaveLength(1);
        // The host guide names the killer on purpose (the host is the game master);
        // everything else on the host screen must not.
        const host = h.view(HOST);
        const screen = JSON.stringify({ ...host, host: { ...host.host, guide: '' } });
        expect(screen).not.toContain('The Killer');
        expect(screen).not.toContain('isOptional');
        for (const p of roster) expect(JSON.stringify(h.view(as(p.id)))).not.toContain("Player 12 (The Momo King's Wife)");
    });

    it('private clues reach only their recipient', () => {
        const h = harness(server, roster, { aiPortraits: false });
        const privateClue = clues.find(c => c.revealed_to !== 'all')!;
        const recipient = characters.find(c => c.name === privateClue.revealed_to)!;
        h.act('assignCharacter', HOST, { playerId: 'p1', characterId: recipient.id });
        h.act('autoCast', HOST);
        h.start();
        h.act('revealClue', HOST, { clueId: privateClue.id });

        expect(h.view(as('p1')).clues[0].content).toBe(privateClue.content);
        expect(h.view(as('p2')).clues[0].content).toBeNull();
        expect(h.view(HOST).clues[0]).toMatchObject({ content: null, recipient: 'p1' });
    });
});

describe('momo: host flow', () => {
    it('host drives phases, toast steps and the carousel', () => {
        const h = cast();
        h.start();
        expect(() => h.act('setPhase', HOST, { phase: 'NOPE' })).toThrow();
        h.act('setPhase', HOST, { phase: 'TOAST' });
        h.act('setToastStep', HOST, { index: 1 });
        expect(() => h.act('setToastStep', HOST, { index: 9 })).toThrow();
        h.act('setPhase', HOST, { phase: 'INTRODUCTIONS' });
        expect(h.state.toastStep).toBe(0);
        h.act('setSuspectIndex', HOST, { index: 2 });
        expect(h.view(as('p1')).suspectIndex).toBe(2);
    });

    it('late joiners get a free character', () => {
        const h = cast();
        h.start();
        const late = { id: 'p9', name: 'Late', photoUrl: null, connected: true, joinedAt: 9 };
        h.ctx.players = [...roster, late];
        const draft = structuredClone(h.state);
        server.onPlayerJoin!(draft, late, h.ctx);
        expect(draft.cast.p9).toBeTruthy();
    });
});
