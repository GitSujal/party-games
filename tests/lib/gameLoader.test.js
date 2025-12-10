import { describe, it, expect } from 'vitest';
import { getGameAssetPath, getPhaseConfig, getNextPhase } from '@/lib/gameLoader';

describe('Game Loader', () => {
    describe('getGameAssetPath', () => {
        it('should generate correct asset paths', () => {
            expect(getGameAssetPath('momo_massacre')).toBe('/game_assets/momo_massacre');
            expect(getGameAssetPath('momo_massacre', 'manifest.json')).toBe('/game_assets/momo_massacre/manifest.json');
            expect(getGameAssetPath('momo_massacre', 'characters/1.json')).toBe('/game_assets/momo_massacre/characters/1.json');
        });

        it('should handle trailing slashes', () => {
            expect(getGameAssetPath('momo_massacre', '')).toBe('/game_assets/momo_massacre');
            expect(getGameAssetPath('momo_massacre', '/')).toBe('/game_assets/momo_massacre');
        });
    });

    describe('getPhaseConfig', () => {
        const mockManifest = {
            phases: [
                { id: 'LOBBY', type: 'lobby', next: 'INTRO' },
                { id: 'INTRO', type: 'cinematic', next: 'PLAYING' },
                { id: 'PLAYING', type: 'investigation', next: 'FINISHED' }
            ]
        };

        it('should find phase by ID', () => {
            const phase = getPhaseConfig(mockManifest, 'INTRO');
            expect(phase).toEqual({ id: 'INTRO', type: 'cinematic', next: 'PLAYING' });
        });

        it('should return undefined for non-existent phase', () => {
            const phase = getPhaseConfig(mockManifest, 'INVALID');
            expect(phase).toBeUndefined();
        });
    });

    describe('getNextPhase', () => {
        const mockManifest = {
            phases: [
                { id: 'LOBBY', type: 'lobby', next: 'INTRO' },
                { id: 'INTRO', type: 'cinematic', next: 'PLAYING' },
                { id: 'PLAYING', type: 'investigation', next: null }
            ]
        };

        it('should return next phase ID', () => {
            expect(getNextPhase(mockManifest, 'LOBBY')).toBe('INTRO');
            expect(getNextPhase(mockManifest, 'INTRO')).toBe('PLAYING');
        });

        it('should return null for last phase', () => {
            expect(getNextPhase(mockManifest, 'PLAYING')).toBeNull();
        });

        it('should return null for non-existent phase', () => {
            expect(getNextPhase(mockManifest, 'INVALID')).toBeNull();
        });
    });
});
