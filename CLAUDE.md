# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a multiplayer party game platform built with Next.js (static export) and deployed on Cloudflare Pages with D1 database. Players join games via QR codes on their phones, while a host controls the game flow through a separate interface. The platform supports two game types with real-time synchronization between host and players:

1. **Murder Mystery** (`momo_massacre`): Story-driven investigation game with character roles, clues, and narrative phases
2. **Imposter** (`imposter`): Social deduction game similar to Werewolf/Mafia where players vote to eliminate imposters who don't know the secret word

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
- All game state lives in D1 database (db-init.sql)
- Frontend components fetch state via `lib/apiClient.js` wrappers
- Host actions require PIN verification for security
- IP-based player locking prevents multi-device cheating (configurable via `IP_PLAYER_LIMIT`)
- Game type determines available phases and mechanics (murder mystery vs imposter)

**Data Loading Flow:**
1. Static game content (characters, clues, storyline) stored in `public/game_assets/{game_type}/`
2. `lib/gameLoader.js` fetches JSON files client-side
3. Database tracks only dynamic state (phase, revealed clues, character assignments)
4. Game registry at `public/game_assets/_registry.json` lists all available games

**Phase System:**

*Murder Mystery Game (`momo_massacre`):*
- `LOBBY`: Players join, host assigns characters
- `INTRO`: Cinematic intro with background/audio
- `TOAST`: Multi-step victim introduction sequence
- `MURDER`: Announcement of the murder
- `INTRODUCTIONS`: Carousel showing each character
- `PLAYING`: Investigation phase with clue reveals
- `FINISHED`: Game conclusion

*Imposter Game (`imposter`):*
- `LOBBY`: Players join (no character assignment needed)
- `ASSIGN`: Host starts game, roles randomly assigned (imposters don't get secret word)
- `PLAYING`: Discussion phase where players try to figure out the secret word and identify imposters
- `VOTING`: Players vote for who they think is the imposter
- `ELIMINATION`: Results revealed with step-by-step progression (votes → eliminations → status → winner)
- `FINISHED`: Game over with winner announcement and confetti

Host controls phase transitions via admin actions. The imposter game supports multiple voting rounds until win conditions are met.

### Component Organization

**Host Interface:**
- `pages/host.js`: Main host dashboard
- `components/common/HostSessionManager.js`: Game session orchestrator that routes to game-specific host components
- `components/murdermystery/HostMomo.js`: Murder mystery host interface
- `components/imposter/HostImposter.js`: Imposter game host interface with voting controls
- `components/common/PhaseLobby.js`: Shared lobby component for both games
- `components/murdermystery/HostSidebar.js`: Persistent sidebar with player list and controls

**Player Interface:**
- `pages/player/[id].js`: Dynamic route for each player
- Murder Mystery: `components/murdermystery/PlayerTabRole.js`, `PlayerTabSecret.js`, `PlayerTabClues.js` - Tab-based character info
- Imposter: `components/imposter/PlayerImposter.js` - Role reveal card and voting interface
- `components/imposter/PlayerVoting.js`: Voting interface for imposter game

**Shared Components:**
- `components/common/PhaseRenderer.js`: Routes to correct phase component based on game state and type
- `components/common/PhaseFinished.js`: Game over screen with restart capability (imposter)
- `components/imposter/Scorecard.js`: Real-time eliminated players sidebar (hides secret word)
- `lib/apiClient.js`: Centralized API client with error handling

## Imposter Game Mechanics

The imposter game is a social deduction game where players must identify imposters who don't know the secret word.

**Game Setup:**
- Host starts game from lobby
- 25% of players randomly assigned as imposters (minimum 1)
- Remaining players are "genuine" and receive the secret word
- Secret word randomly selected from `words.json`

**Voting & Elimination:**
- Players vote for who they suspect is an imposter
- Vote counts hidden during voting to prevent bias
- Host finalizes voting to trigger elimination logic
- Results displayed with horizontal bar chart showing top 5 vote recipients
- Step-by-step reveal: votes → eliminations → game status → winner (if applicable)

**Tie Handling:**
- If multiple players receive the same highest vote count: **NO ONE is eliminated**
- Round increments automatically, voting session resets
- Players see tie warning banner on next voting screen
- Game continues with fresh voting round

**Win Conditions:**
- **Genuine Players Win**: All imposters eliminated (imposters = 0)
- **Imposters Win**: Imposters equal or outnumber genuine players (imposters ≥ genuine)
- Game continues through multiple rounds until win condition met

**Round Management:**
- Each voting session has a round number tracked in database
- Votes filtered by round number to isolate each session
- Round auto-increments when:
  - Tie detected → increment and return to VOTING
  - Game continues after elimination → increment when transitioning ELIMINATION → PLAYING → VOTING

**Secret Word Security:**
- **CRITICAL**: Secret word must NEVER be revealed during gameplay
- Scorecard shows only "Genuine" or "Imposter" (no word)
- Elimination screen shows only "Genuine Player" (no word)
- Word only visible to genuine players on their own role card
- Imposters see "IMPOSTER" role but no word

**Visual Features:**
- Scorecard sidebar showing eliminated players throughout game (both host and player screens)
- Confetti animation on winner announcement
- Horizontal bar chart visualization for vote results
- Role cards styled identically for imposters and genuine players (prevents screen-peeking)

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

**API Actions (functions/api/game.js):**
- `CREATE_SESSION`: Generate game ID and host PIN
- `JOIN`: Add player to game (checks IP and name uniqueness)
- `GET_STATE`: Fetch current game state (filtered by round for votes)
- `CAST_VOTE`: Player submits vote during VOTING phase (imposter game)
- `ADMIN_ACTION`: Host commands including:
  - `SET_PHASE`: Change game phase (auto-increments round when ELIMINATION → PLAYING)
  - `ASSIGN_CHARACTER`: Assign role to player (murder mystery)
  - `REVEAL_CLUE`: Make clue visible to all players (murder mystery)
  - `START_ROUND_IMPOSTER`: Assign roles and start imposter game
  - `FINALIZE_VOTING`: Calculate elimination results, handle ties, check win conditions
  - `INCREMENT_ROUND`: Manually increment voting round (usually automatic)
  - `RESET`: Reset game (supports keepPlayers for imposter restart)
  - `RESTART_IMPOSTER`: Keep players, assign new roles, pick new word
  - `KICK`: Remove player from game

**Database Schema (db-init.sql):**
- `games`: Game sessions with phase tracking
  - `id`: Game code (e.g., "ABC123")
  - `game_type`: "momo_massacre" or "imposter"
  - `phase`: Current phase
  - `current_voting_round`: Voting round number (imposter game)
  - `host_pin`: SHA-256 hashed PIN
- `players`: Player roster with character assignments and IP tracking
  - `character_id`: Role/character assignment (or "IMPOSTER" / "WORD:secretword" for imposter game)
  - `is_alive`: Elimination status (imposter game)
  - `avatar_url`: Player avatar (R2 storage)
- `revealed_clues`: Many-to-many relationship tracking which clues are visible (murder mystery)
- `votes`: Voting records (imposter game)
  - `voter_id`: Player who cast vote
  - `voted_for_id`: Player who was voted for
  - `round_number`: Which voting round
  - Filtered by round when retrieving game state

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

**Input Validation (functions/api/game.js):**
- Names: 1-50 chars, alphanumeric + unicode, regex validated
- Game IDs: 4-8 uppercase alphanumeric
- PINs: Exactly 4 digits
- Game types: Whitelist (`momo_massacre`, `imposter`)
- Phases: Whitelist validation (includes VOTING, ELIMINATION, ASSIGN for imposter)
- Player IDs: UUID format validation
- Vote targets: Verified to be alive players in the same game
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
- **Game TTL**: Games auto-delete after 24 hours (configurable in functions/api/game.js)
- **CORS**: Set `ALLOWED_ORIGIN` in wrangler.toml for production
- **Cleanup**: Use `functions/api/cleanup.js` as cron endpoint for expired game cleanup

## Imposter Game Implementation Notes

**Critical Security Rules:**
- **NEVER reveal the secret word** except on genuine players' own role cards
- Scorecard, elimination screens, and all public displays must hide the word
- Use "Genuine Player" or "Genuine" without showing the word
- All player role cards (imposter and genuine) must look identical to prevent screen-peeking

**Voting System:**
- Votes are stored with `round_number` to support multiple voting rounds
- `getGameState` filters votes by `current_voting_round` from games table
- Round increments automatically in two scenarios:
  1. Tie detected during FINALIZE_VOTING → increment and return to VOTING
  2. Phase transition ELIMINATION → PLAYING → round increments via SET_PHASE
- Old votes from previous rounds are not deleted, just filtered out by round number

**Tie Handling Logic:**
- Count players with max votes
- If count > 1: **TIE** (no elimination, increment round, return to VOTING)
- If count = 1: **ELIMINATION** (eliminate player, go to ELIMINATION phase)
- If count = 0: Error condition (should not happen)

**Win Condition Checks:**
- Only checked after a successful elimination (not after ties)
- **Genuine Win**: `impostersAlive === 0`
- **Imposter Win**: `impostersAlive >= genuinePlayersAlive`
- If neither condition met: Game continues with next round

**Component State Management:**
- PhaseElimination uses `revealStep` state for step-by-step reveal (1→2→3→4)
- PlayerVoting checks `gameState.votes` filtered by current round to determine if player already voted
- Confetti triggers on step 4 when `gameOver === true`

**Restart Functionality:**
- RESTART_IMPOSTER keeps all players, clears votes, revives all players
- Randomly assigns new roles (25% imposters)
- Picks new random word from words.json
- Resets to ASSIGN phase with `current_voting_round = 1`

**Dependencies:**
- `canvas-confetti`: Winner celebration animation
- Word list stored in `public/game_assets/imposter/words.json`
