# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a multiplayer murder mystery party game platform built with Next.js (static export) and deployed on Cloudflare Pages with D1 database. Players join games via QR codes on their phones, while a host controls the game flow through a separate interface. The platform supports multiple game scenarios with real-time synchronization between host and players.

## Development Commands

**Local Development:**
```bash
npm run dev
# Builds static site, then runs Cloudflare Pages dev server on port 3000
# Automatically binds to local D1 database
```

**Build:**
```bash
npm run build
# Generates static Next.js export to ./out directory
```

**Database:**
```bash
# Initialize database schema (first time setup)
npm run db:init

# Create D1 database (one-time)
npx wrangler d1 create murder-mystery-db

# Login to Cloudflare (required for D1)
npx wrangler login
```

**Deployment:**
```bash
npm run deploy
# Builds and deploys to Cloudflare Pages
```

## Architecture

### Frontend-Backend Split

- **Frontend**: Next.js static export (no server-side rendering) - all pages pre-rendered to HTML
- **Backend**: Single Cloudflare Pages Function at `functions/api/game.js` - handles all database operations
- **Database**: Cloudflare D1 (SQLite) - stores games, players, revealed clues
- **Real-time Sync**: SWR library polls API endpoint for state updates (no WebSockets)

### Key Architectural Patterns

**Game State Management:**
- All game state lives in D1 database (schema.sql:5-39)
- Frontend components fetch state via `lib/apiClient.js` wrappers
- Host actions require PIN verification for security
- IP-based player locking prevents multi-device cheating (configurable via `IP_PLAYER_LIMIT`)

**Data Loading Flow:**
1. Static game content (characters, clues, storyline) stored in `public/game_assets/{game_type}/`
2. `lib/gameLoader.js` fetches JSON files client-side
3. Database tracks only dynamic state (phase, revealed clues, character assignments)
4. Game registry at `public/game_assets/_registry.json` lists all available games

**Phase System:**
Each game defines a sequence of phases in `manifest.json`:
- `LOBBY`: Players join, host assigns characters
- `INTRO`: Cinematic intro with background/audio
- `TOAST`: Multi-step victim introduction sequence
- `MURDER`: Announcement of the murder
- `INTRODUCTIONS`: Carousel showing each character
- `PLAYING`: Investigation phase with clue reveals
- `FINISHED`: Game conclusion

Host controls phase transitions via admin actions (functions/api/game.js:179-204).

### Component Organization

**Host Interface:**
- `pages/host.js`: Main host dashboard
- `components/PhaseLobby.js`, `PhasePlaying.js`, etc.: Phase-specific host views
- `components/HostSidebar.js`: Persistent sidebar with player list and controls

**Player Interface:**
- `pages/player/[id].js`: Dynamic route for each player
- `components/PlayerTabRole.js`, `PlayerTabSecret.js`, `PlayerTabClues.js`: Tab-based character info
- `components/PlayerWaiting.js`, `PlayerIntro.js`: Phase-specific player views

**Shared:**
- `components/PhaseRenderer.js`: Routes to correct phase component based on game state
- `lib/apiClient.js`: Centralized API client with error handling

## Adding New Games

Create folder structure in `public/game_assets/new_game_name/`:

```
new_game_name/
├── manifest.json       # Game config with phase definitions (see momo_massacre/manifest.json)
├── storyline.json      # Narrative text for each phase
├── clues.json          # Array of clue objects with id, text, image
├── characters/         # Character JSON files (1.json, 2.json, etc.)
│   └── 1.json          # Each contains: id, name, role, description, secret, action, alibi, goal
└── media/
    ├── characters/     # Character portrait images
    ├── scenes/         # Background images
    └── audio/          # Optional audio files
```

Update `public/game_assets/_registry.json` to register the new game.

Character JSON structure (public/game_assets/momo_massacre/characters/1.json:1-14):
- `id`, `name`, `role`: Basic identity
- `about`: Public backstory (shown to all during introductions)
- `secret`: Private info (only visible to assigned player)
- `action`: Special instructions for this character
- `alibi`, `goal`, `tips`: Additional private information
- `icon`, `image`: Display assets

## Key Technical Details

**API Actions (functions/api/game.js:53-64):**
- `CREATE_SESSION`: Generate game ID and host PIN
- `JOIN`: Add player to game (checks IP and name uniqueness)
- `ADMIN_ACTION`: Host commands (SET_PHASE, ASSIGN_CHARACTER, REVEAL_CLUE, RESET)
- `KICK`: Remove player from game

**Database Schema (schema.sql):**
- `games`: Game sessions with phase tracking
- `players`: Player roster with character assignments and IP tracking
- `revealed_clues`: Many-to-many relationship tracking which clues are visible

**Environment Variables:**
- `IP_PLAYER_LIMIT`: Set to "false" in dev to disable IP-based player locking (wrangler.toml:19)

**Cloudflare Configuration (wrangler.toml):**
- D1 binding name must be `murder_mystery_db` to match functions/api/game.js:273
- Static output directory is `out` (Next.js export target)

## Security Features

**Cryptographic Security:**
- All IDs use `crypto.randomUUID()` or `crypto.getRandomValues()`
- PINs hashed with SHA-256 before database storage (functions/api/game.js:32-42)
- PIN verification uses constant-time comparison via hash matching

**Input Validation (functions/api/game.js:76-140):**
- Names: 1-50 chars, alphanumeric + unicode, regex validated
- Game IDs: 4-8 uppercase alphanumeric
- PINs: Exactly 4 digits
- Game types: Whitelist (`momo_massacre`)
- Phases: Whitelist validation
- All endpoints validate before database operations

**Rate Limiting (functions/api/game.js:146-216):**
- In-memory rate limiter with automatic cleanup
- Per-IP limits: CREATE_SESSION (5/min), JOIN (10/min), ADMIN_ACTION (30/min)
- Returns 429 with retry-after header when exceeded

**Database Security:**
- All queries use prepared statements with bound parameters
- Database operations wrapped in try-catch (functions/api/game.js:222-253)
- Compound indexes for performance (schema.sql:37-43)
- Automatic expiration: Games deleted after 24 hours
- Cleanup cron: functions/api/cleanup.js

**Session Management:**
- Sensitive data (PINs, player IDs) use sessionStorage not localStorage
- Sessions cleared on tab close
- No long-term storage of credentials

**Error Handling:**
- React error boundaries (components/ErrorBoundary.js)
- Exponential backoff on polling failures (pages/host.js:62-111, pages/player/[id].js:29-90)
- User-friendly error messages, no stack traces in production

**Security Headers (_headers file):**
- X-Frame-Options, CSP, X-Content-Type-Options
- Permissions-Policy restricts features
- CORS configured per environment

## Testing

```bash
npm test              # Run all tests (30 tests)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Test Coverage:**
- API validation, game loader, API client
- 30 passing tests across 3 suites

## Important Production Notes

- **PIN Security**: PINs are SHA-256 hashed. Old plaintext PINs from pre-security databases won't work
- **Rate Limiting**: In-memory storage, resets on deployment
- **Game TTL**: Games auto-delete after 24 hours (configurable in functions/api/game.js:399)
- **CORS**: Set `ALLOWED_ORIGIN` in wrangler.toml for production
- **Cleanup**: Use `functions/api/cleanup.js` as cron endpoint for expired game cleanup
