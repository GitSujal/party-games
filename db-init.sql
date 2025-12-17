-- Murder Mystery Platform - Complete Database Initialization
-- Version: 4.0 (with Avatar Support + Imposter Game Voting)
-- This script creates a fresh database with all tables, columns, and indexes

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS revealed_clues;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS games;

-- ============================================================================
-- Games table (sessions)
-- ============================================================================
CREATE TABLE games (
    id TEXT PRIMARY KEY,                -- e.g., "ABC123"
    game_type TEXT NOT NULL,            -- e.g., "momo_massacre"
    host_pin TEXT NOT NULL,             -- SHA-256 hashed PIN
    phase TEXT DEFAULT 'LOBBY',
    min_players INTEGER DEFAULT 4,
    current_voting_round INTEGER DEFAULT 1, -- For imposter game voting rounds
    expires_at DATETIME,                -- TTL for game cleanup
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Players table
-- ============================================================================
CREATE TABLE players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    name TEXT NOT NULL,
    character_id TEXT,
    original_image TEXT,                -- Original uploaded selfie
    avatar_url TEXT,                    -- AI-generated avatar image (or original if not generated)
    avatar_generated_for_character TEXT, -- Character ID this avatar was generated for (prevents regeneration)
    is_host INTEGER DEFAULT 0,
    is_alive INTEGER DEFAULT 1,         -- For imposter game (1 = alive, 0 = eliminated)
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- ============================================================================
-- Revealed clues
-- ============================================================================
CREATE TABLE revealed_clues (
    game_id TEXT NOT NULL,
    clue_id INTEGER NOT NULL,
    revealed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, clue_id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- ============================================================================
-- Votes table (for imposter game)
-- ============================================================================
CREATE TABLE votes (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,             -- Player who cast the vote
    voted_for_id TEXT NOT NULL,         -- Player who was voted for
    round_number INTEGER DEFAULT 1,     -- Which voting round
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (voter_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (voted_for_id) REFERENCES players(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX idx_players_game ON players(game_id);
CREATE INDEX idx_players_game_host ON players(game_id, is_host);
CREATE INDEX idx_clues_game ON revealed_clues(game_id);
CREATE INDEX idx_players_ip_game ON players(ip_address, game_id);
CREATE INDEX idx_games_expires ON games(expires_at);
CREATE INDEX idx_games_created ON games(created_at);
CREATE INDEX idx_votes_game ON votes(game_id);
CREATE INDEX idx_votes_round ON votes(game_id, round_number);
CREATE INDEX idx_votes_voter ON votes(voter_id);
