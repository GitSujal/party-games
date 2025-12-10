-- Murder Mystery Platform D1 Schema
-- Version: 1.0

-- Games table (sessions)
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,                -- e.g., "ABC123"
    game_type TEXT NOT NULL,            -- e.g., "momo_massacre"
    host_pin TEXT NOT NULL,
    phase TEXT DEFAULT 'LOBBY',
    min_players INTEGER DEFAULT 4,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    name TEXT NOT NULL,
    character_id TEXT,
    is_host INTEGER DEFAULT 0,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Revealed clues
CREATE TABLE IF NOT EXISTS revealed_clues (
    game_id TEXT NOT NULL,
    clue_id INTEGER NOT NULL,
    revealed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, clue_id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_clues_game ON revealed_clues(game_id);
CREATE INDEX IF NOT EXISTS idx_players_ip ON players(ip_address);
