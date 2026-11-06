# Adding a game

A game is one folder in `src/games/<id>/` plus one line in each registry. The platform
gives you rooms, QR join, realtime sync, host auth, the lobby, kick, play-again, rules
modal and a themed UI kit for free.

```bash
npm run new-game trivia-night "Trivia Night"
npm run dev          # → http://localhost:5173/g/trivia-night
```

The scaffolder copies `src/games/_template` (a working "fastest finger" game), registers it
in `catalog.ts`, `registry.server.ts` and `registry.client.ts`, and creates
`tests/games/trivia-night.test.ts`. New games start **unlisted** (`enabled: false`): hidden
from the homepage, but playable at `/g/<id>`.

## The three pieces

```
src/games/trivia-night/
├── meta.ts          # GameMeta — catalog card, players, theme, settings (public)
├── server.ts        # GameServer — state, actions, timers, view() (runs in the Durable Object)
├── content/         # optional JSON/markdown content (import from server.ts if secret)
└── client/          # GameClient — Host (big screen) + Player (phone) React screens
```

Big media (images, audio) goes in `public/games/<id>/` and is referenced as `/games/<id>/...`.

### meta.ts

```ts
export default defineMeta({
    id: 'trivia-night',
    name: 'Trivia Night',
    tagline: 'One line for the card.',
    description: 'A paragraph for the game page.',
    mark: '/games/trivia-night/mark.svg',  // optional white SVG drawn on the game colour
    players: { min: 2, max: 20 },
    duration: '20 min',
    tags: ['Trivia'],
    theme: { color: '#2F49D1' },            // the game's one colour; white text must read on it
    features: { photo: false },              // ask joiners for a selfie?
    settings: [                              // rendered automatically on the game page + lobby
        { key: 'rounds', label: 'Rounds', type: 'number', default: 10, min: 5, max: 30 },
    ],
});
```

### server.ts

Reducer-style. Handlers mutate a draft; throwing `GameError` rejects the action and nothing changes.

```ts
export default defineServer<State, Settings>({
    setup: ctx => ({ ... }),               // new room / back to lobby
    start(state, ctx) { ... },             // host pressed Start; return a string to refuse
    actions: {
        answer: defineAction<State, Settings, { choice: number }>({
            by: 'player',                  // 'host' | 'player' | 'any'
            schema: z.object({ choice: z.number().int() }),
            handle(state, { choice }, ctx, actor) { ... },
        }),
    },
    onTimer(state, id, ctx) { ... },       // fired by ctx.timers.set(id, ms)
    onPlayerJoin / onPlayerLeave,          // optional
    view(state, viewer) { ... },           // REQUIRED: what this viewer may see
});
```

`ctx` gives you `players`, `settings`, `random` (crypto), `now()`, `timers`, `emit(event)`
for one-off effects (confetti, sounds), `media` (R2 + AI images) and `runAsync()` for slow work.

**`view()` is the security boundary.** Each socket gets its own snapshot, built only from
what `view()` returns. Secrets (roles, answers, words) go only to the viewers who own them.
Content imported by `server.ts` never reaches the browser unless `view()` sends it. Don't
import secret content from `client/`, because client code is public.

### Mechanics (`src/platform/mechanics`)

| Module   | Use it for                                                          |
| -------- | ------------------------------------------------------------------- |
| `voting` | ballots, change-your-vote, tally, ties (`openBallot`, `castVote`, `tallyBallot`) |
| `roles`  | secret roles by ratio (`countFromRatio`, `assignRoles`)             |
| `timer`  | server countdowns clients can render (`startCountdown`)             |
| `scoring`| points and a ranked leaderboard                                     |
| `teams`  | balanced random teams                                               |
| `phases` | `assertPhase`, `phaseFlow` transition guards                        |
| `random` | crypto-backed `pick`/`shuffle`; `seededRandom` for tests            |

### client/

```ts
export default defineClient<View>({
    Host,              // big screen while playing
    Player,            // phone while playing
    HowToPlay,         // optional: rules modal + game page
    HostLobbyPanel,    // optional: extra lobby controls (e.g. casting)
    PlayerLobby,       // optional: replaces the default "you're in" screen
});
```

Each screen gets `{ room, game, meta, send }`. `game` is your `view()` output for this
viewer. `await send('answer', { choice })` resolves when the server accepts the action and
throws with the server's message when it doesn't. `useAction(send)` adds a busy flag and an
error toast.

Every game shares the platform's paper-and-ink look (neutral ground, near-black ink, hairlines,
Geist); the game's colour is used only for its tile, primary buttons and highlights. Build
screens from `src/ui` so they stay on-design: `Button`, `ConfirmButton`, `RuleList`,
`RevealCard`, `FlipCard`, `Countdown`, `VotePicker`, `VoteProgress`, `VoteResults`,
`Avatar`, `PlayerChip`, `Markdown`, `Banner`, `Modal`, `fireConfetti`, `useGameEvent`.

## Testing

`tests/helpers.ts` has a `harness(server, players, settings)` that runs your server like
the room does (clone → handle → commit, fake timers):

```ts
const h = harness(server, players('Ann', 'Ben', 'Cat'), { rounds: 3 });
h.start();
h.act('answer', as('p1'), { choice: 2 });
h.advance(30_000);                       // fire timers
expect(JSON.stringify(h.view(as('p2')))).not.toContain(secret);
```

Always test that secrets don't leak through `view()`. Then run `npm run dev` and
`npm run smoke` (add a section for your game to `scripts/smoke.mjs` if it has secrets).

When it's ready, set `enabled: true` (or remove the line) to list it on the homepage.
