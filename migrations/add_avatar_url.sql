-- Migration: Add avatar_url column to players table
-- Run this on existing databases: npx wrangler d1 execute murder-mystery-db --file=migrations/add_avatar_url.sql

ALTER TABLE players ADD COLUMN avatar_url TEXT;
ALTER TABLE players ADD COLUMN original_image TEXT;
ALTER TABLE players ADD COLUMN avatar_generated_for_character TEXT;
