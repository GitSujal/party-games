# Party Games

Game night, sorted. Put a game on the big screen, and everyone joins from their phone
with a QR code. No app, no accounts.

**Live:** https://partygames.datasparta.com

| Game | Players | What it is |
| --- | --- | --- |
| 🕵️ **Imposter** | 3–20 | Everyone gets the secret word except the imposters. Give clues, vote, and catch the fakes. |
| 🥟 **The Momo Massacre** | 3–14 | A hosted murder-mystery dinner with characters, secrets, clues and a poisoned Momo King. |
| 🖼️ **Guess The** | 1–20 | Picture-clue quiz: guess the movie, actor, word, phrase or sports person from 1–5 images. Fastest correct answers score most. |

## How it works

- **One Cloudflare Worker** serves the site and the API.
- **One Durable Object per room** keeps the game state and pushes every change to every screen over WebSockets.
- **Each screen gets only what it's allowed to see.** Secret words, roles and clues never reach other players' phones.
- **Games are plug-ins.** Each one is a folder with `meta.ts`, `server.ts` and `client/`, built on shared mechanics (voting, roles, timers, scoring) and a shared UI kit.

## Develop

```bash
npm install
cp .dev.vars.example .dev.vars   # optional: GEMINI_API_KEY for AI portraits
npm run dev                      # http://localhost:5173
```

Open a game, click **Host**, then open the join link in another browser (or a phone on your
network with `npm run dev -- --host`).

```bash
npm test            # unit tests (game logic + secrecy)
npm run smoke       # end-to-end against the dev server
npm run typecheck
```

## Add a game

```bash
npm run new-game trivia-night "Trivia Night"
```

See [docs/ADDING_A_GAME.md](docs/ADDING_A_GAME.md).

## Deploy

```bash
npx wrangler login
npx wrangler r2 bucket create party-games-media     # once
npx wrangler secret put GEMINI_API_KEY               # optional
npm run deploy
```

`wrangler.jsonc` attaches the custom domain `partygames.datasparta.com`. That requires the
`datasparta.com` zone to be on the same Cloudflare account.
