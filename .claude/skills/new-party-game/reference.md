# Party Games by Data Sparta: API reference and patterns

Source of truth: `src/platform/sdk.ts`, `src/platform/mechanics/*`, `src/platform/client/types.ts`,
`src/ui/index.ts`, `tests/helpers.ts`. If anything here disagrees with those files, the code wins.

## Imports (from `src/games/<id>/…`)

```ts
// server.ts
import { z } from 'zod';
import { GameError, defineAction, defineServer, type GameContext, type Viewer } from '../../platform/sdk';
import { assertPhase, openBallot, castVote, tallyBallot, startCountdown, addPoints, leaderboard /* … */ } from '../../platform/mechanics';

// client/*.tsx
import { defineClient, type GameScreenProps } from '../../../platform/client/types';
import { PLATFORM_ACTIONS } from '../../../platform/protocol';
import type { Player } from '../../../platform/sdk';
import { Button, RevealCard, useAction, useGameEvent /* … */ } from '../../../ui';
import type { View } from '../server';   // type-only!
```

## Server contract

```ts
type Settings = { rounds: number; answerSeconds: number };   // keys = meta.settings keys
type Ctx = GameContext<Settings>;

export interface State { phase: Phase; round: number; /* plain JSON only */ }

function view(state: State, viewer: Viewer) {
    const me = viewer.playerId;               // undefined for the host
    return { phase: state.phase, /* shared, safe fields */, me: me ? { /* owner-only */ } : null };
}
export type View = ReturnType<typeof view>;

export default defineServer<State, Settings>({
    setup: (ctx, previous) => ({ phase: 'waiting', round: 0, used: previous?.used ?? [] }),   // empty roster possible; previous = replaced state
    start(state, ctx) { if (ctx.players.length < 3) return 'Need 3 players'; /* deal, set phase */ },
    actions: {
        next: defineAction<State, Settings>({ by: 'host', handle(state, _p, ctx) { … } }),
        answer: defineAction<State, Settings, { choice: number }>({
            by: 'player',
            schema: z.object({ choice: z.number().int().min(0).max(3) }),
            handle(state, { choice }, ctx, actor) { const id = actor.playerId!; … },
        }),
    },
    onTimer(state, id, ctx) { … },
    onPlayerJoin(state, player, ctx) { … },     // mid-game joins only (lobby joins need nothing)
    onPlayerLeave(state, playerId, ctx) { … },  // kicks
    view,
});
```

`GameContext`: `roomCode`, `players: Player[]` (`{id, name, photoUrl, connected, joinedAt}`),
`settings`, `random` (`int(max)`, `pick(arr)`, `shuffle(arr)`), `now()`,
`timers.set(id, ms)` / `timers.clear(id)`, `emit({type, ...}, to?: Viewer)`,
`media` (`storage`, `imageGeneration`, `url(key)`, `generateFromPhoto({photoKey, prompt, outKey})`),
`photoKeyOf(playerId)`, `runAsync(work)`.

`Viewer` = `{ role: 'host' }` | `{ role: 'player', playerId }`.

Platform actions (host only; send from the client with `PLATFORM_ACTIONS.*`): `start`, `kick {playerId}`,
`playAgain` (setup + start, same players), `backToLobby` (setup), `updateSettings {settings}` (lobby only).

## Mechanics

| Function | Notes |
|---|---|
| `openBallot(voters, candidates, {round?, allowSelfVote?})` → `Ballot` | store the ballot in state |
| `castVote(ballot, voterId, candidateId)` | throws a GameError for ineligible voters, self-votes and bad targets; re-voting changes the vote |
| `hasVoted`, `votesCast`, `everyoneVoted(ballot)` | |
| `tallyBallot(ballot)` → `{round, tally:[{id,count}], leaders, winner\|null, tie, totalVotes}` | tie → `winner` null |
| `countFromRatio(total, ratio, min=1)` | always < half the group |
| `assignRoles(ids, {spy: 2}, 'crew', ctx.random)` → `Record<id, 'spy'\|'crew'>` | |
| `playersWithRole(roles, role)` | |
| `startCountdown(id, ms, ctx.now())` → `{id, endsAt, durationMs}` | put it in state, pair it with `ctx.timers.set(id, ms)` |
| `remainingMs(c, now)`, `formatClock(ms)` | |
| `addPoints(scores, id, n)`, `leaderboard(scores, ids?)` → `[{id, score, rank}]` | shared ranks on ties |
| `splitIntoTeams(ids, n, ctx.random)`, `teamOf(teams, id)` | |
| `assertPhase(state.phase, ...allowed)`, `phaseFlow({a:['b'], …}).go(state, 'b')` | |
| `seededRandom(seed)` | deterministic tests only |

## Client contract

```ts
export default defineClient<View>({
    Host,            // ({ room, game, meta, send }: GameScreenProps<View>) — the TV while playing
    Player,          // the phone while playing
    HowToPlay,       // ({ role, game }) — rules modal + game page (game is null on the game page)
    HostLobbyPanel,  // optional: extra card under the lobby roster (receives GameScreenProps)
    PlayerLobby,     // optional: replaces the default "You're in!" phone screen
});
```

- `room`: `{ code, gameId, status, players: Player[], settings, hostConnected, me: Viewer }`
- `game`: this viewer's `view()` output
- `send(type, payload)`: Promise that resolves on ack and rejects with the server's error message

UI kit (`src/ui`):

| Component | Props |
|---|---|
| `Button` | `variant: 'primary'\|'danger'\|'ghost'`, `size: 'sm'\|'lg'`, `block`, `loading`, `icon` |
| `ConfirmButton` | Button props + `onConfirm`, `confirmLabel` (two-step, no browser dialogs) |
| `IconButton` | `label` + children |
| `RevealCard` | `label`, `value`, `hint`: tap-to-reveal secret, identical look for all roles |
| `RuleList` | `rules: [{title, body}]`: numbered hairline rows for HowToPlay |
| `FlipCard` | `front`, `back`, `height`, `frontStyle`, `backStyle` |
| `Countdown` | `countdown` (from state), `lowAtMs`, `style` · hook `useRemaining(countdown)` |
| `VotePicker` | `candidates: Player[]`, `myVote`, `onVote(id) => Promise`, `prompt` (give it `key={round}`) |
| `VoteProgress` | `voters: Player[]`, `voted: string[]` (host screen) |
| `VoteResults` | `tally`, `players`, `top=5` (animated bars) |
| `Avatar` / `PlayerChip` | `name, src, size, offline` / `player, out, trailing` |
| `Markdown` | children string (no raw HTML) |
| `Banner` | `tone: 'info'\|'danger'` |
| `Modal` | `open, onClose, title` |
| `FullscreenMessage` | `title, loading` |
| `useAction(send)` → `[act, busy]` | `act(type, payload)` → `Promise<boolean>` and shows an error toast |
| `useGameEvent(type, fn)`, `useToast()(msg, 'error'?)`, `fireConfetti()` | |

Button variants: default (outlined), `primary` (game colour: the main action), `ink` (black:
host flow controls), `danger`, `ghost`; sizes `sm`/`lg`.

CSS: layout `pg-stack` (column, `--gap`), `pg-row`, `pg-center`, `pg-narrow` (phone column),
`pg-stage` (TV, left-aligned); type `pg-display` (big headline: set `font-size` inline),
`pg-section-title`, `pg-label-sm` (small muted label), `pg-muted`, `pg-mono`; structure
`pg-rule` (hairline above), `pg-list` (hairline rows), `pg-roster pg-roster--lg` (two-column
player list), `pg-facts` (dl of label/value), `pg-card` (white panel, use sparingly), `pg-tag`,
`pg-tabs` (segmented control), `pg-dot` (game-colour dot), `pg-dark` (dark panel over a photo),
`pg-enter` (rise-in). Colours: `var(--pg-primary|primary-soft|text|muted|faint|border|surface|bg|danger|success)`.
Prefer these over new CSS. Inline styles are fine for one-off layout.

## Patterns

### Phase machine driven by the host, with a timed phase
```ts
const TIMER = 'answer';
function openAnswering(state: State, ctx: Ctx) {
    state.phase = 'answering';
    state.answers = {};
    state.countdown = startCountdown(TIMER, ctx.settings.answerSeconds * 1000, ctx.now());
    ctx.timers.set(TIMER, ctx.settings.answerSeconds * 1000);
}
function closeAnswering(state: State, ctx: Ctx) {
    ctx.timers.clear(TIMER);
    state.countdown = null;
    state.phase = 'reveal';
}
// onTimer: if (id === TIMER && state.phase === 'answering') closeAnswering(state, ctx);
// in the answer handler: if (Object.keys(state.answers).length === state.participants.length) closeAnswering(state, ctx);
```

### Participants vs roster
Snapshot `state.participants = ctx.players.map(p => p.id)` in `start()`. Late joiners aren't
participants: show them a "you'll join next game" screen (see Imposter `Player.tsx`). On kick,
filter them out of `participants`, ballots, scores and turn order.

### Hidden per-player info (roles, words, hands, answers)
Keep it in a `Record<playerId, …>` in state. In `view()`, read only `state.x[viewer.playerId]`
into `me`. Shared fields contain ids and counts, never values. Reveal publicly only after the
fact (e.g. `role: !alive || finished ? roles[id] : null`).

### Voting round with tie → revote (from Imposter)
```ts
const result = tallyBallot(state.ballot!);
if (!result.winner) { state.round++; state.ballot = openBallot(alive, alive, { round: state.round }); ctx.emit({ type: 'tie' }); return; }
```
The host screen shows `VoteProgress` (who voted, not for whom); phones show `VotePicker`; results use `VoteResults`.

### Step-by-step reveal
Store `revealStep` in state and gate fields in `view()` (`eliminated: step >= 2 ? … : null`).
The host advances with an action; auto-advance with a `useEffect` + `setTimeout` on the Host screen.

### Effects
`ctx.emit({ type: 'confetti' })` on the server, `useGameEvent('confetti', () => fireConfetti())`
on the client. Events aren't persisted, so anything a reconnecting client must see belongs in state.

### Content
Small lists go in JSON under `src/games/<id>/content/`, imported by `server.ts` (secret) or by
the client (public only). Many files: `import.meta.glob<T>('./content/items/*.json', { eager: true, import: 'default' })`.
Markdown: `import text from './content/x.md?raw'`. Images and audio go in `public/games/<id>/`.

### Player photos / AI images
Set `features: { photo: true }` in meta to show a selfie step on join. Server-side:
`ctx.photoKeyOf(id)`, and `ctx.media.imageGeneration` before calling
`ctx.runAsync(async () => { const key = await ctx.media.generateFromPhoto({...}); return s => { s.portraits[id] = ctx.media.url(key); }; })`.
See `requestPortrait` in `src/games/momo-massacre/server.ts`. Always degrade gracefully when
it's unavailable.

## Test harness

```ts
import server from '../../src/games/<id>/server';
import { HOST, as, harness, players } from '../helpers';

const h = harness(server, players('Ann', 'Ben', 'Cat'), { rounds: 3, answerSeconds: 30 }); // ids p1, p2, p3
h.start();                         // throws if start() refuses
h.act('answer', as('p1'), { choice: 2 });  // validates the schema + actor like the room does
h.advance(30_000);                 // fires due timers
h.view(HOST); h.view(as('p2'));    // per-viewer snapshots
h.events                           // emitted events
h.state                            // committed state
```
