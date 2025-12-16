-- Murder Mystery Platform - Complete Database Initialization
-- Version: 3.0 (with Avatar Support)
-- This script creates a fresh database with all tables, columns, and indexes

-- Drop existing tables to ensure clean slate
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
-- Indexes for performance
-- ============================================================================
CREATE INDEX idx_players_game ON players(game_id);
CREATE INDEX idx_players_game_host ON players(game_id, is_host);
CREATE INDEX idx_clues_game ON revealed_clues(game_id);
CREATE INDEX idx_players_ip_game ON players(ip_address, game_id);
CREATE INDEX idx_games_expires ON games(expires_at);
CREATE INDEX idx_games_created ON games(created_at);
