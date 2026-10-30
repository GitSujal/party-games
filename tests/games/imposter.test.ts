import { describe, expect, it } from 'vitest';
import server, { winnerOf } from '../../src/games/imposter/server';
import { HOST, as, harness, players } from '../helpers';

const roster = players('Ada', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal');
const settings = { imposterPercent: 25, discussionSeconds: 60 };

function started(seed = 7) {
    const h = harness(server, roster, settings, seed);
    h.start();
    const imposters = roster.filter(p => h.state.roles[p.id] === 'imposter').map(p => p.id);
    const genuine = roster.filter(p => h.state.roles[p.id] === 'genuine').map(p => p.id);
    return { h, imposters, genuine };
}

function voteOut(h: ReturnType<typeof started>['h'], target: string) {
    for (const voter of h.state.ballot!.voters) {
        if (voter !== target) h.act('vote', as(voter), { targetId: target });
    }
    // The target votes for someone else so it isn't a self-vote.
    const other = h.state.ballot!.voters.find(v => v !== target)!;
    h.act('vote', as(target), { targetId: other });
    h.act('closeVoting', HOST);
}

describe('imposter: setup', () => {
    it('deals 25% imposters and one word', () => {
        const { h, imposters } = started();
        expect(imposters).toHaveLength(2);
        expect(h.state.word).toBeTruthy();
        expect(h.state.phase).toBe('reveal');
    });

    it('refuses to start with fewer than 3 players', () => {
        const h = harness(server, players('A', 'B'), settings);
        expect(() => h.start()).toThrow(/at least 3/);
    });
});

describe('imposter: secrecy', () => {
    it('only genuine players ever see the word', () => {
        const { h, imposters, genuine } = started();
        const word = h.state.word!;
        const leak = (v: object) => JSON.stringify(v).includes(word);

        expect(leak(h.view(HOST))).toBe(false);
        for (const id of imposters) expect(leak(h.view(as(id)))).toBe(false);
        for (const id of genuine) expect(h.view(as(id)).me.word).toBe(word);

        // Still true after someone is eliminated and at the end of the game.
        h.act('beginDiscussion', HOST);
        h.act('startVoting', HOST);
        voteOut(h, genuine[0]);
        expect(leak(h.view(HOST))).toBe(false);
        for (const id of imposters) expect(leak(h.view(as(id)))).toBe(false);
    });

    it('hides roles until a player is out', () => {
        const { h, genuine } = started();
        expect(h.view(HOST).players.every((p: { role: unknown }) => p.role === null)).toBe(true);
        h.act('beginDiscussion', HOST);
        h.act('startVoting', HOST);
        voteOut(h, genuine[0]);
        const out = h.view(HOST).players.find((p: { id: string }) => p.id === genuine[0]);
        expect(out.role).toBe('genuine');
        expect(h.view(HOST).players.filter((p: { role: unknown }) => p.role !== null)).toHaveLength(1);
    });

    it('never exposes who voted for whom', () => {
        const { h, genuine } = started();
        h.act('beginDiscussion', HOST);
        h.act('startVoting', HOST);
        h.act('vote', as(genuine[0]), { targetId: genuine[1] });
        const host = h.view(HOST);
        expect(host.voting.voted).toEqual([genuine[0]]);
        expect(host.voting.myVote).toBeNull();
        expect(h.view(as(genuine[1])).voting.myVote).toBeNull();
        expect(h.view(as(genuine[0])).voting.myVote).toBe(genuine[1]);
    });
});

describe('imposter: flow', () => {
    it('the discussion timer opens voting', () => {
        const { h } = started();
        h.act('beginDiscussion', HOST);
        expect(h.view(HOST).countdown.durationMs).toBe(60_000);
        h.advance(59_000);
        expect(h.state.phase).toBe('discussion');
        h.advance(2_000);
        expect(h.state.phase).toBe('voting');
    });

    it('a tie eliminates nobody and starts a fresh ballot', () => {
        const { h } = started();
        h.act('beginDiscussion', HOST);
        h.act('startVoting', HOST);
        const [a, b, c, d] = roster.map(p => p.id);
        h.act('vote', as(a), { targetId: c });
        h.act('vote', as(b), { targetId: c });
        h.act('vote', as(c), { targetId: a });
        h.act('vote', as(d), { targetId: a });
        h.act('closeVoting', HOST);
        expect(h.state).toMatchObject({ phase: 'voting', tied: true, round: 2 });
        expect(Object.values(h.state.alive).every(Boolean)).toBe(true);
        expect(h.state.ballot!.votes).toEqual({});
        expect(h.events.map(e => e.type)).toContain('tie');
    });

    it('closing an empty ballot is rejected', () => {
        const { h } = started();
        h.act('beginDiscussion', HOST);
        h.act('startVoting', HOST);
        expect(() => h.act('closeVoting', HOST)).toThrow(/Nobody has voted/);
    });

    it('genuine players win when every imposter is out', () => {
        const { h, imposters } = started();
        for (const imp of imposters) {
            if (h.state.phase !== 'discussion') h.act('beginDiscussion', HOST);
            h.act('startVoting', HOST);
            voteOut(h, imp);
            expect(h.state.phase).toBe('results');
            if (h.state.result!.winner) break;
            h.act('nextRound', HOST);
        }
        expect(h.state.result!.winner).toBe('genuine');
        // Winner is only revealed on the last step.
        expect(h.view(HOST).result.winner).toBeNull();
        h.act('revealNext', HOST);
        h.act('revealNext', HOST);
        h.act('revealNext', HOST);
        expect(h.view(HOST).result.winner).toBe('genuine');
        h.act('nextRound', HOST);
        expect(h.view(HOST).winner).toBe('genuine');
    });

    it('imposters win once they match the genuine players', () => {
        const { h, genuine } = started();
        h.act('beginDiscussion', HOST);
        for (let i = 0; h.state.phase !== 'finished'; i++) {
            h.act('startVoting', HOST);
            voteOut(h, genuine[i]);
            if (h.state.result!.winner) {
                h.act('nextRound', HOST);
                break;
            }
            h.act('nextRound', HOST);
        }
        expect(winnerOf(h.state)).toBe('imposters');
        // 2 imposters vs 2 genuine left after 4 genuine eliminations.
        expect(Object.values(h.state.alive).filter(Boolean)).toHaveLength(4);
    });

    it('players cannot run host actions', () => {
        const { h } = started();
        expect(() => h.act('beginDiscussion', as('p1'))).toThrow();
    });

    it('kicking the last imposter ends the game', () => {
        const { h, imposters } = started();
        const draft = structuredClone(h.state);
        for (const imp of imposters) server.onPlayerLeave!(draft, imp, h.ctx);
        expect(draft.phase).toBe('finished');
        expect(winnerOf(draft)).toBe('genuine');
    });
});
