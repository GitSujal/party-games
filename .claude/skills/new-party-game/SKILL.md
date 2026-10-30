---
name: new-party-game
description: Create a new game on the Party Games platform (partygames.datasparta.com) by reusing its rooms, realtime Durable Object, mechanics (voting, roles, timers, scoring, teams) and UI kit. Use when the user wants to add, build, scaffold or prototype a new party game, or turn a game idea into a playable game in this repo.
---

# Build a new Party Games game

The platform already provides rooms, QR join, a WebSocket sync per room (one Durable Object
each), host auth/PIN, lobby, kick, play-again, rules modal, theming, reconnects and expiry.
**A game only writes three things:** `meta.ts`, `server.ts` and `client/`. Never touch
`src/worker/`, `src/app/` or `src/platform/` to build a single game. If the game truly needs
a new *reusable* capability, add it as a mechanic or UI component (see "Extending the
platform") and tell the user.

Exact APIs and copy-paste patterns: [reference.md](reference.md). Working examples to read
before writing code:
- `src/games/imposter/`: secret roles, voting rounds with ties, timer, step-by-step reveal
- `src/games/momo-massacre/`: content-driven phases, lobby panel, private per-player info, async AI images
- `src/games/_template/`: the minimal game the scaffolder copies (timer + scoring)

## Workflow

### 1. Pin down the design (before any code)

If the user hasn't specified these, ask briefly or propose sensible defaults and state them:
- Player range, rough duration, and what the **big screen (host)** shows vs **phones** show.
- The **phases** (e.g. `answering → reveal → scores → finished`) and who advances each (host button, timer, or "everyone acted").
- **Secret information**: who may see what. This becomes the `view()` table.
- Host-tunable **settings** (rounds, timer seconds, ratios, categories).
- Content (word lists, prompts, questions) and whether any of it is secret (answers are).

Write the **view table** first, e.g.:

| Field | Host (TV) | Player (owner) | Other players |
|---|---|---|---|
| question text | ✓ | ✓ | ✓ |
| correct answer | after reveal | after reveal | after reveal |
| my answer | ✗ | ✓ | ✗ |
| who has answered | ✓ (ids only) | ✓ | ✓ |

### 2. Scaffold

```bash
npm run new-game <kebab-id> "Display Name"
```

This creates `src/games/<id>/` from `_template`, registers it in `src/games/catalog.ts`,
`registry.server.ts` and `registry.client.ts` (at the `// new-game:` markers), and creates
`tests/games/<id>.test.ts`. The game starts **unlisted** (`enabled: false`): hidden from the
homepage but playable at `/g/<id>`. Then replace the template logic with the real game.

### 3. `meta.ts`

Fill in `defineMeta({...})`: id, name, tagline (one plain sentence, no em-dash flourishes),
description, optional `mark` (a simple white SVG at `public/games/<id>/mark.svg`, drawn on the
game colour; without one the tile shows the initial), `players`, `duration`, `tags` (first one
is shown as the game's "Type"), `theme: { color }` (one mid-dark colour that white text reads
on), optional `features.photo`, and `settings` fields. Settings render
automatically on the game page and in the lobby, and arrive server-side as `ctx.settings`,
clamped to the declared ranges.

### 4. `server.ts`

Write the State type, `setup`, `start`, `actions`, optional `onTimer`/`onPlayerJoin`/
`onPlayerLeave`, and a **named `view` function** whose return type is exported as `View`.
Compose `src/platform/mechanics` rather than re-implementing voting, role dealing, countdowns,
scores or teams. Server rules (all enforced by how the room engine works):

- Handlers **mutate the draft `state`** and return nothing; `throw new GameError('msg')` to reject (the message is shown to the user and nothing is committed).
- Handlers are **synchronous**. Slow work goes through `ctx.runAsync(async () => state => {...})`.
- Use `ctx.now()`, `ctx.random`, `ctx.timers.set/clear` and `ctx.emit` instead of `Date.now()`, `Math.random()`, `setTimeout` or broadcasting. Timers survive hibernation because they're DO alarms.
- State must be plain JSON (it is `structuredClone`d and stored): no `Map`, `Set`, class instances or functions.
- Validate every payload with a zod `schema`. Set `by: 'host' | 'player' | 'any'`. Never name an action starting with `room:`.
- Guard phases with `assertPhase(state.phase, ...)`.
- `setup(ctx, previous?)` runs on room creation, settings change, back-to-lobby and play-again (followed by `start()`), so it must work with an empty roster. `previous` is the state being replaced: carry room-long memory (used words/questions) from it. `start()` gets the real roster in `ctx.players`; return a string to refuse.
- Late joiners trigger `onPlayerJoin` (make them spectators or deal them in). Kicks trigger `onPlayerLeave`: remove them from ballots, scores and turn order, and re-check win conditions.

### 5. `client/`

`client/index.ts(x)` default-exports `defineClient<View>({ Host, Player, HowToPlay?, HostLobbyPanel?, PlayerLobby? })`.
The shell already renders the lobby, top bar, room menu and connection banner, so don't rebuild them.

- Import the view type **type-only**: `import type { View } from '../server'`. A value import would bundle server content (secrets) into public JS.
- Never import secret content (answers, roles, solutions) from `client/`. Public content (e.g. a manifest or story text) may be imported.
- **Design language (paper and ink):** neutral ground, near-black text, hairline rules instead of cards and shadows, one family (Geist; Geist Mono for codes and numbers). The game colour is for the primary action and highlights only. No gradients, glows, emoji, coloured left-border cards or pill badges. Copy is short and plain. Big moments are typographic: a large left-aligned headline, not decoration. Build with `src/ui` components and `pg-*` classes (see reference.md). Use `useAction(send)` for buttons (busy flag + error toast) and `useGameEvent(type, fn)` for `ctx.emit` effects.
- The **Host screen is a TV everyone sees**: never show a single player's secret there. Host controls that would spoil things go behind a toggle.
- TV screens: `pg-stage` (left-aligned), or a two-column split like Imposter's (`imposter.css`: the moment on the left, standings and the host's next action bottom-right in an `ink` button). Game-specific CSS goes in `client/<game>.css`, imported from `client/index.ts`, using only `--pg-*` variables.
- Phones are ~380px wide: use `pg-narrow`, big tap targets (`size="lg"`, `block`). Hidden info goes in `RevealCard`, which looks identical for every role until tapped.

### 6. Tests: `tests/games/<id>.test.ts`

Use `tests/helpers.ts` (`harness`, `players`, `HOST`, `as`). Cover: start/refusal, every
phase transition, timers via `h.advance(ms)`, edge cases (ties, nobody acted, kicks via
`server.onPlayerLeave!(draft, id, h.ctx)`), win conditions, and **secrecy**:
`expect(JSON.stringify(h.view(viewer))).not.toContain(secret)` for every viewer who must not
see it, including `HOST`.

### 7. Verify (all must pass before reporting done)

```bash
npm run typecheck && npm test
npm run build && grep -rl "<a secret string>" dist/client   # must print nothing
npm run dev   # then play it at http://localhost:5173/g/<id>: host tab + ≥2 player tabs
```

Join players in separate tabs via `/join/<CODE>` (sessionStorage keeps tabs separate), or
script them against the API like `scripts/smoke.mjs` does. If the game has secrets, add a
section for it to `scripts/smoke.mjs` and run `npm run smoke` against the dev server. Check
the browser console for errors on both host and player screens.

### 8. Ship

When the user is happy: set `enabled: true` (or delete the line) in `meta.ts` to list it on
the homepage, add the game to the games table in `README.md` and a short "Game specifics"
entry in `CLAUDE.md`. Deploy only when the user asks (`npm run deploy`).

## Extending the platform (only when reusable)

- A new reusable rule (e.g. buzzer queue, turn order, bidding) goes in `src/platform/mechanics/<name>.ts`: pure functions over plain data, exported from `mechanics/index.ts`, with tests in `tests/mechanics/`.
- A new reusable widget goes in `src/ui/components/`, exported from `src/ui/index.ts`. Style it with `--pg-*` variables in `src/ui/ui.css`.
- A new server capability (e.g. another AI service) goes on `GameContext` in `src/platform/sdk.ts`, wired in `GameRoom.withContext`, with a stub in `tests/helpers.ts`.
- New npm packages: latest major version, or N-1 at most (check `npm view <pkg> dist-tags`).
