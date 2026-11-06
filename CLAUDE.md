# CLAUDE.md

This file guides Claude Code (claude.ai/code) when working in this repository.

## Overview

**Party Games by Data Sparta** (partygames.datasparta.com) is a platform for phone-controlled party games.
A host opens a game on a big screen, and players join by scanning a QR code. Every game
shares the same infrastructure: rooms, realtime sync, auth, lobby, mechanics and UI kit.
A game itself is a self-contained folder in `src/games/<id>/`.

Current games: **Imposter** (`imposter`, social deduction), **The Momo Massacre**
(`momo-massacre`, hosted murder mystery) and **Guess The** (`guess-the`, picture-clue quiz).

## Stack

- **One Cloudflare Worker** (`src/worker/index.ts`, Hono) serves the API and exports the `GameRoom` Durable Object. Static assets (the SPA) are served by Workers static assets; `/api/*` runs the Worker first.
- **One Durable Object per room** (`src/worker/room/GameRoom.ts`) holds all state in DO storage (no database) and talks to clients over hibernatable WebSockets.
- **Vite + React 19 + React Router** SPA (`src/app`), built with `@cloudflare/vite-plugin`, so `npm run dev` runs the SPA, Worker and DO together in workerd.
- **TypeScript** throughout, with **zod** for validation, **R2** (`MEDIA`) for player photos and AI portraits, and **Workers Rate Limiting** bindings.
- Dependencies stay on the latest major version, or N-1 at most. (Vitest is on 4 because `@cloudflare/vitest-pool-workers` requires it.)

## Commands

```bash
npm run dev            # http://localhost:5173 — SPA + Worker + Durable Objects (workerd)
npm test               # vitest: mechanics + game server logic + redaction
npm run smoke          # end-to-end over HTTP/WebSocket against a running server (default localhost:5173)
npm run typecheck      # app (DOM) and worker tsconfigs separately
npm run build          # dist/client (SPA) + dist/party_games (Worker)
npm run deploy         # build + wrangler deploy + upload ADMIN_TOKEN + seed Guess The if its catalog is empty (needs GUESS_API and ADMIN_TOKEN in .env)
npm run new-game <id> "Name"   # scaffold from src/games/_template and register
npm run cf-typegen     # regenerate src/worker/worker-configuration.d.ts after editing wrangler.jsonc
```

## Layout

```
src/
  worker/                 Worker entry (HTTP API), GameRoom DO, crypto, media (R2 + Gemini)
  platform/               game-agnostic, shared by Worker and app
    sdk.ts                THE game contract: GameMeta, GameServer, GameContext, Viewer
    protocol.ts           WebSocket messages + HTTP payload schemas
    settings.ts           resolve/clamp settings declared in meta
    mechanics/            voting, roles, timer, scoring, teams, phases, random (pure, tested)
    client/               useRoom (WS + reconnect), session storage, api, GameClient types, events
  ui/                     design system (ui.css tokens + components); games build on this
  app/                    routes (Home, GameDetail, Join) and shells (HostShell, PlayerShell)
  games/
    catalog.ts            every GameMeta (homepage order)
    registry.server.ts    gameId → server (Worker only)
    registry.client.ts    gameId → lazy client (app only)
    _template/            starter game used by the scaffolder
    imposter/             meta.ts, server.ts, content/, client/
    momo-massacre/        meta.ts, server.ts, content.ts, content/, client/
    guess-the/            meta.ts, server.ts, catalog/ (types + KV/R2 store), client/   (content lives in KV/R2, not here)
public/games/<id>/        large media (images/audio)
seed/guess-the/           catalog.json + assets/: the starting content, loaded with `guess-the-catalog.mjs seed`
tests/                    helpers.ts (game harness), mechanics/, games/
scripts/                  new-game.mjs, smoke.mjs, guess-the-catalog.mjs (content CLI), guess-the-media.mjs
docs/ADDING_A_GAME.md     how to build a new game
```

## How a room works

- `POST /api/rooms {gameId, settings}` creates a room code (4–5 chars, no ambiguous letters) and DO `idFromName(code)`. It returns a `hostToken` and a 4-digit `pin`.
- `POST /api/rooms/:code/join {name, photo?}` returns a `playerToken`. `POST /api/rooms/:code/resume {pin}` returns a new host token for another device (8 bad PINs → 5 min lock).
- `GET /api/rooms/:code/ws?token=` upgrades to a WebSocket. The DO stores the viewer in the socket attachment.
- Client → server: `{t:'action', id, type, payload}`. `room:*` types are platform actions (start, kick, playAgain, backToLobby, updateSettings); all others go to the game's `actions`.
- Server → client: a full `{t:'state', room, game}` snapshot after every change, built **per viewer** with `GameServer.view()`. Also `ack`/`error` per action id, `event` for ephemeral effects, `kicked`.
- Handlers run on a `structuredClone` of state and are committed only if they don't throw.
- `setup(ctx, previous)` runs on room creation, play-again, back-to-lobby and settings change; `previous` is the replaced state (for room-long memory such as used questions).
- One alarm drives game timers (`ctx.timers`) and room expiry (`ROOM_TTL_HOURS` after last activity; storage and R2 `rooms/<code>/` are deleted).
- Tokens live in the browser under `pg:host:<code>` / `pg:player:<code>` (session + local storage). Only SHA-256 hashes are stored server-side.

## Security rules (critical)

- **`view()` is the only thing a client ever receives.** Never put secrets in fields shared with other viewers. Unit tests assert this for every game; keep them.
- **Client code is public.** `client/` may import only public content. Secret content (characters, clues, words, solutions) must be imported only from `server.ts`/`content.ts`. Example: Momo's killer id lives in `content/solution.json`, not in `manifest.json` (which the client imports).
- Imposter: the word goes only to genuine players' own `me.word`. The host screen never receives it, even at game end. Roles become public only for eliminated players (and everyone at `finished`). Votes show only who has voted, never for whom.
- Guess The: answers live only in KV (`gt:levels:<category>`), read by the room's Durable Object. The admin API (`/api/admin/guess-the`) exposes them and needs `ADMIN_TOKEN`. A question's answer reaches clients only in `reveal`, after the question closes. Guesses stay private to their owner until then, and scores change only at the reveal. Clue image file names must not contain the answer (they're public).
- Momo: players get their own character's secret/alibi/goal/tips/killer flag only after the game starts. The host gets public character info plus the host guide. Private clue content reaches only its recipient. Don't expose `role`/`isOptional` in public character data, because they identify the killer.
- After building, `grep` `dist/client` for secret strings when adding content.

## Game specifics

**Imposter** (`src/games/imposter/server.ts`): phases `reveal → discussion → voting → results → (discussion | finished)`. Imposter count comes from `countFromRatio(n, imposterPercent)`: at least 1, fewer than half. A tie keeps the phase at `voting`, increments `round` and opens a fresh ballot. Results reveal in steps (1 tally, 2 eliminated + role, 3 remaining counts, 4 winner); the host screen auto-advances steps 2→3→4. Win: genuine when no imposters are alive; imposters when `imposters >= genuine` alive. The discussion timer (setting) opens voting automatically.

**Guess The** (`src/games/guess-the/`): phases `guessing → reveal → (guessing | finished)`. Categories come from KV and are switched on or off by the host in the lobby (and mid-game) with the `setCategory` action; the choice lives in game state (`disabled`) and carries over play-again. A question closes when every participant has guessed or passed, when the answer timer ends, or when the host forces it. Matching is `matchesAnswer` (mechanics/answers.ts) against `answer` + `accept`. A correct answer scores 50, plus a speed bonus by time since the question opened (≤5s 50, ≤7.5s 35, ≤10s 25, ≤15s 15, then 0; `SPEED_TIERS`). The host can skip a question (it is never revealed and doesn't count). The room loads the catalog (`GameServer.loadContent` → `ctx.content`) when it is created, when its Durable Object wakes, and before each start, play-again, back-to-lobby or settings change; the open question is copied into state so edits can't break it mid-question. Questions come from a room-long shuffle bag: `seen` carries over via `setup(ctx, previous)`, so nothing repeats until the chosen categories are exhausted. Each question may list image `credits`; they are sent only with the reveal and shown on the TV then. **Content management** (no deploy needed; new content appears from a room's next game start): the Worker's admin API plus `node scripts/guess-the-catalog.mjs` (categories, levels, assets, export/import, seed); see `src/worker/guess-the-api.ts` for the routes. Add levels with the **`create-guess-the-level`** skill (finds images online, snaps and strips them, uploads to R2 under opaque names and saves the level to KV). Clue files are public at `/api/guess-the/assets/<category>/<file>` and `/api/guess-the/categories` lists categories, so other apps can reuse them; a Worker bound to the same KV/R2 can read `gt:categories` / `gt:levels:<category>` / `guess-the/<category>/<file>` directly. Set `ADMIN_TOKEN` (`.dev.vars`; `wrangler secret put` in prod). `npm run deploy` creates the KV namespace, uploads `ADMIN_TOKEN` from `.env` and seeds `seed/guess-the` when the live catalog is empty. Note `.env` now points the CLI and the skill's `add-level.mjs` at production; use `GUESS_API=http://localhost:5173` to work locally.

**Momo Massacre** (`src/games/momo-massacre/`): phases come from `content/manifest.json` (types: cinematic, toast, announcement, carousel, investigation, finale). Characters are cast in the lobby (`HostLobbyPanel`); auto-cast fills non-optional characters (victim, killer) first, in random seat order. The host drives `setPhase`/`setToastStep`/`setSuspectIndex`, so every screen stays in sync. `revealClue` adds to the evidence board. With `GEMINI_API_KEY` and R2 configured and the `aiPortraits` setting on, casting a player who uploaded a selfie generates a portrait via `ctx.runAsync`.

## Config

`wrangler.jsonc` vars: `ROOM_TTL_HOURS`, `MAX_PLAYERS_PER_ROOM`, `ONE_PLAYER_PER_DEVICE` (reuse the seat for the same IP), `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`. Secrets: `GEMINI_API_KEY` (`.dev.vars` locally, `wrangler secret put` in prod). Static security headers are in `public/_headers`; API headers are set in the Worker.

## Adding a game

Use the project skill **`new-party-game`** (`.claude/skills/new-party-game/`): it has the full workflow, hard rules and exact APIs. Human-facing version: `docs/ADDING_A_GAME.md`. In short: `npm run new-game <id>`, then edit `meta.ts`, `server.ts` (with `view()` redaction) and `client/`, and add tests to `tests/games/<id>.test.ts`.
