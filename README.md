# Party Game Platform

A multiplayer party game platform built with Next.js and deployed on Cloudflare Pages with D1 database. Supports multiple game modes including murder mystery and social deduction games.

## Game Modes

### 🔍 Murder Mystery (Momo Massacre)
- Story-driven investigation game with character roles
- Host assigns characters and reveals clues throughout the game
- Players piece together evidence to solve the mystery
- Cinematic introductions with audio and visuals

### 🎭 Imposter (Social Deduction)
- Social deduction game where players identify imposters
- 25% of players are imposters who don't know the secret word
- Multiple voting rounds with strategic elimination
- Tie handling: no elimination if votes are tied
- Win conditions: eliminate all imposters or imposters take over
- Real-time scorecard showing eliminated players
- Confetti celebration for winners

## Features

- 🎮 **Two Game Types** - Mystery investigation and social deduction
- 👥 **Multi-Player** - Host multiple simultaneous games (4-20+ players)
- 📱 **QR Code Join** - Players scan to join from their phones
- 🔄 **Real-time Updates** - Live sync between host and players via polling
- 🗳️ **Voting System** - Hidden vote counts with bar chart results (imposter)
- 📊 **Live Scorecard** - Track eliminated players throughout game
- 🎉 **Visual Effects** - Confetti animations and smooth transitions
- ❓ **How to Play Modals** - In-game help accessible to both hosts and players throughout gameplay
- 🌐 **Edge Deployment** - Fast, global access via Cloudflare
- 🔒 **Secure** - PIN-protected host controls, input validation, rate limiting

## Tech Stack

- **Frontend**: Next.js (Static Export), React
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Assets**: Local static files (expandable to R2)
- **UI Libraries**: Lucide React (icons), canvas-confetti (celebrations)
- **State Management**: SWR for polling, React hooks

## Local Development

### Prerequisites
- Node.js 18+
- npm
- Cloudflare account (for D1 database)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **Create D1 database** (first time only)
   ```bash
   npx wrangler d1 create murder-mystery-db
   ```

4. **Update wrangler.toml** with your database ID
   ```toml
   [[d1_databases]]
   database_id = "YOUR_DATABASE_ID_HERE"
   ```

5. **Initialize database**
   ```bash
   npm run db:init
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open** http://localhost:3000

## Deployment to Cloudflare

### Option 1: GitHub Integration (Recommended)

1. Push to GitHub
2. Connect repo in Cloudflare Pages dashboard
3. Configure:
   - Build command: `npm run build`
   - Output directory: `out`
4. Add D1 binding in Settings > Functions

### Option 2: CLI Deployment

```bash
npm run deploy
```

## How It Works

### Murder Mystery Flow
1. Host creates game and shares QR code/link
2. Players join on their phones
3. Host assigns character roles from lobby
4. Game progresses through cinematic phases
5. Host reveals clues throughout investigation
6. Players discuss and solve the mystery

### Imposter Game Flow
1. Host creates game and shares QR code/link
2. Players join on their phones
3. Host starts game → roles randomly assigned
   - 25% become imposters (don't see the word)
   - 75% are genuine (see the secret word)
4. **Discussion Phase**: Players talk to identify imposters
5. **Voting Phase**: Each player votes for suspected imposter
6. **Elimination Phase**:
   - Host finalizes voting
   - Results shown with bar chart (top 5)
   - If tied: no elimination, vote again
   - If clear winner: player eliminated, role revealed
7. **Win Check**:
   - Genuine win if all imposters eliminated
   - Imposters win if they equal/outnumber genuine players
   - Otherwise: continue to next round
8. Winner announced with confetti 🎉

### Key Imposter Features
- **Secret Word Protection**: Word never revealed except to genuine players
- **Tie Handling**: Multiple rounds if votes are tied
- **Live Scorecard**: Shows eliminated players (without revealing word)
- **Round Tracking**: Each voting session isolated by round number
- **Restart Capability**: Keep same players, new word and roles

## Adding New Games

1. Create folder: `public/game_assets/new_game_name/`
2. Add required files:
   ```
   new_game_name/
   ├── manifest.json       # Game config with phase definitions
   ├── storyline.json      # Narrative text (murder mystery)
   ├── words.json          # Word list (imposter)
   ├── clues.json          # Clue data (murder mystery)
   ├── characters/         # Character JSON files (murder mystery)
   └── media/              # Images and audio
   ```
3. Update `public/game_assets/_registry.json`
4. Deploy

## Environment Variables

| Variable | Dev Value | Prod Value | Description |
|----------|-----------|------------|-------------|
| `IP_PLAYER_LIMIT` | `false` | `true` | Limit one player per IP |
| `ALLOWED_ORIGIN` | `*` | `https://yourdomain.pages.dev` | CORS origin restriction |
| `ENVIRONMENT` | `development` | `production` | Environment mode |

## Project Structure

```
├── functions/              # Cloudflare Pages Functions
│   └── api/game.js         # Main API endpoint (all game logic)
├── lib/
│   ├── apiClient.js        # Frontend API wrapper
│   └── gameLoader.js       # Game data loader
├── components/             # React components
│   ├── common/             # Shared components (PhaseRenderer, Scorecard, etc.)
│   ├── murdermystery/      # Momo Massacre specific components (HostMomo, HowToPlayModal)
│   └── imposter/           # Imposter game components (voting, elimination, HowToPlayModal)
├── pages/                  # Next.js pages
│   ├── index.js            # Game type selection
│   ├── host.js             # Host dashboard
│   ├── join.js             # Player join page
│   └── player/[id].js      # Player game view
├── public/game_assets/     # Static game data
│   ├── _registry.json      # Game registry
│   ├── momo_massacre/      # Murder mystery assets
│   └── imposter/           # Imposter game assets (words.json)
├── db-init.sql             # D1 database schema (all tables)
└── wrangler.toml           # Cloudflare config
```

## Production Deployment

### Production Configuration

1. **Update `wrangler.toml`**
   ```toml
   [vars]
   ENVIRONMENT = "production"
   IP_PLAYER_LIMIT = "true"
   ALLOWED_ORIGIN = "https://yourdomain.pages.dev"
   ```

2. **Initialize/Update database schema**
   ```bash
   # For production database
   npx wrangler d1 execute murder-mystery-db --remote --file=db-init.sql
   ```

   **⚠️ Important**: This will drop existing tables and recreate them. Make sure to backup any important data first. The schema includes:
   - Games table with `current_voting_round` for imposter game
   - Players table with `is_alive` for elimination tracking
   - Votes table for imposter voting system
   - Revealed clues table for murder mystery

3. **Test and deploy**
   ```bash
   npm test
   npm run build
   npm run deploy
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment mode | `production` |
| `IP_PLAYER_LIMIT` | Limit one player per IP | `true` |
| `ALLOWED_ORIGIN` | CORS allowed origin | `*` (dev) |

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Database Schema

The platform uses Cloudflare D1 (SQLite) with the following tables:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `games` | Game sessions | `id`, `game_type`, `phase`, `current_voting_round`, `host_pin` (hashed) |
| `players` | Player roster | `id`, `name`, `character_id`, `is_alive`, `avatar_url` |
| `votes` | Voting records | `voter_id`, `voted_for_id`, `round_number` (imposter) |
| `revealed_clues` | Clue visibility | `game_id`, `clue_id` (murder mystery) |

**Key Design Decisions:**
- Votes are filtered by `round_number` to support multiple voting rounds
- `is_alive` column tracks elimination status in imposter game
- `current_voting_round` in games table ensures consistent round tracking
- All foreign keys have `ON DELETE CASCADE` for automatic cleanup
- PINs are SHA-256 hashed before storage

## Security Features

- ✅ Cryptographic ID/PIN generation (crypto.randomUUID)
- ✅ SHA-256 PIN hashing
- ✅ Comprehensive input validation
- ✅ Rate limiting (5-60 req/min per endpoint)
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Error boundaries and exponential backoff
- ✅ Session-based storage (sessionStorage)
- ✅ Automatic game cleanup (24h TTL)

## License

MIT
