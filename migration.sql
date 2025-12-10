-- Migration: Add expires_at and new indexes to existing database
-- Run this ONCE to update existing database

-- Add expires_at column to games table
ALTER TABLE games ADD COLUMN expires_at DATETIME;

-- Add new indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_game_host ON players(game_id, is_host);
CREATE INDEX IF NOT EXISTS idx_players_ip_game ON players(ip_address, game_id);
CREATE INDEX IF NOT EXISTS idx_games_expires ON games(expires_at);
CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at);

-- Update existing games with expiration date (24 hours from creation)
UPDATE games SET expires_at = datetime(created_at, '+24 hours') WHERE expires_at IS NULL;
