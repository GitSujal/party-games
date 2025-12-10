# Murder Mystery Platform

A multiplayer murder mystery party game built with Next.js and deployed on Cloudflare Pages with D1 database.

## Features

- 🎭 **Multi-Game Support** - Easily add new murder mystery scenarios
- 👥 **Multi-Player** - Host multiple simultaneous games
- 📱 **QR Code Join** - Players scan to join from their phones
- 🔄 **Real-time Updates** - Live sync between host and players
- 🌐 **Edge Deployment** - Fast, global access via Cloudflare

## Tech Stack

- **Frontend**: Next.js (Static Export)
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Assets**: Local static files (expandable to R2)

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

## Adding New Games

1. Create folder: `public/game_assets/new_game_name/`
2. Add required files:
   ```
   new_game_name/
   ├── manifest.json       # Game config
   ├── storyline.json      # Narrative text
   ├── clues.json          # Clue data
   ├── characters/         # Character JSON files
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
│   └── api/game.js         # API endpoint
├── lib/
│   ├── apiClient.js        # Frontend API wrapper
│   └── gameLoader.js       # Game data loader
├── components/             # React components
├── pages/                  # Next.js pages
├── public/game_assets/     # Static game data
├── schema.sql              # D1 database schema
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

2. **Run migration** (if updating from older version)
   ```bash
   npx wrangler d1 execute murder-mystery-db --remote --file=migration.sql
   ```

   **⚠️ Important**: This migration adds security features including PIN hashing. Existing games with plaintext PINs will need to be recreated.

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
