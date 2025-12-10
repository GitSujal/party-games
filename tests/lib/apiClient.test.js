import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '@/lib/apiClient';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getGameState', () => {
        it('should fetch game state successfully', async () => {
            const mockResponse = {
                gameId: 'TEST123',
                phase: 'LOBBY',
                players: [],
                revealedClues: []
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockResponse)
            });

            const result = await api.getGameState('TEST123');

            expect(result).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('gameId=TEST123'),
                expect.any(Object)
            );
        });

        it('should throw error on failed request', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: async () => JSON.stringify({ error: 'Game not found' })
            });

            await expect(api.getGameState('INVALID')).rejects.toThrow('Game not found');
        });
    });

    describe('createSession', () => {
        it('should create a new game session', async () => {
            const mockResponse = {
                gameId: 'ABC123',
                hostPin: '1234',
                player: { id: 'player1', name: 'HOST', isHost: true }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockResponse)
            });

            const result = await api.createSession('momo_massacre', 4, 'HOST');

            expect(result).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('CREATE_SESSION')
                })
            );
        });
    });

    describe('joinGame', () => {
        it('should join a game successfully', async () => {
            const mockResponse = {
                player: { id: 'player2', name: 'TestPlayer', characterId: null, isHost: false }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockResponse)
            });

            const result = await api.joinGame('ABC123', 'TestPlayer');

            expect(result).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('JOIN')
                })
            );
        });

        it('should handle duplicate name error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                text: async () => JSON.stringify({ error: 'Name already taken!' })
            });

            await expect(api.joinGame('ABC123', 'DuplicateName')).rejects.toThrow('Name already taken!');
        });
    });

    describe('adminAction', () => {
        it('should execute admin actions with valid PIN', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify({ success: true })
            });

            const result = await api.setPhase('ABC123', '1234', 'PLAYING');

            expect(result).toEqual({ success: true });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('ADMIN_ACTION')
                })
            );
        });

        it('should reject admin actions with invalid PIN', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                text: async () => JSON.stringify({ error: 'Invalid PIN' })
            });

            await expect(api.setPhase('ABC123', 'wrong', 'PLAYING')).rejects.toThrow('Invalid PIN');
        });
    });
});
