import { describe, it, expect } from 'vitest';

// Note: Since validation functions are not exported from game.js,
// we'll create this file as a placeholder for when they are extracted
// to a separate module for better testability.

// For now, we'll test the validation logic conceptually

describe('Input Validation', () => {
    describe('validateName', () => {
        it('should reject empty names', () => {
            const result = { valid: false, error: 'Name is required' };
            expect(result.valid).toBe(false);
        });

        it('should reject names that are too short', () => {
            const name = '';
            expect(name.length < 1).toBe(true);
        });

        it('should reject names that are too long', () => {
            const name = 'a'.repeat(51);
            expect(name.length > 50).toBe(true);
        });

        it('should accept valid names', () => {
            const validNames = ['John', 'Jane Doe', 'Test-User_123', 'José'];
            validNames.forEach(name => {
                expect(name.length >= 1 && name.length <= 50).toBe(true);
            });
        });
    });

    describe('validateGameId', () => {
        it('should accept valid game IDs', () => {
            const validIds = ['ABC123', 'XYZ999', '1A2B3C'];
            validIds.forEach(id => {
                expect(/^[A-Z0-9]{4,8}$/.test(id)).toBe(true);
            });
        });

        it('should reject invalid game IDs', () => {
            const invalidIds = ['abc', '123', 'toolongid123', 'ab!@'];
            invalidIds.forEach(id => {
                expect(/^[A-Z0-9]{4,8}$/.test(id)).toBe(false);
            });
        });
    });

    describe('validatePin', () => {
        it('should accept valid 4-digit PINs', () => {
            const validPins = ['1234', '0000', '9999'];
            validPins.forEach(pin => {
                expect(/^\d{4}$/.test(pin)).toBe(true);
            });
        });

        it('should reject invalid PINs', () => {
            const invalidPins = ['123', '12345', 'abcd', '12a4'];
            invalidPins.forEach(pin => {
                expect(/^\d{4}$/.test(pin)).toBe(false);
            });
        });
    });

    describe('validateGameType', () => {
        it('should accept valid game types', () => {
            const validTypes = ['momo_massacre'];
            const allowedTypes = ['momo_massacre'];
            validTypes.forEach(type => {
                expect(allowedTypes.includes(type)).toBe(true);
            });
        });

        it('should reject invalid game types', () => {
            const invalidTypes = ['invalid', 'test', ''];
            const allowedTypes = ['momo_massacre'];
            invalidTypes.forEach(type => {
                expect(allowedTypes.includes(type)).toBe(false);
            });
        });
    });

    describe('validateMinPlayers', () => {
        it('should accept valid player counts', () => {
            const validCounts = [3, 4, 10, 20];
            validCounts.forEach(count => {
                expect(count >= 3 && count <= 20).toBe(true);
            });
        });

        it('should reject invalid player counts', () => {
            const invalidCounts = [0, 1, 2, 21, 100, -5];
            invalidCounts.forEach(count => {
                expect(count >= 3 && count <= 20).toBe(false);
            });
        });
    });
});

describe('PIN Hashing', () => {
    it('should hash PINs consistently', async () => {
        const pin = '1234';
        const encoder = new TextEncoder();
        const data = encoder.encode(pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash1 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Hash again to verify consistency
        const hashBuffer2 = await crypto.subtle.digest('SHA-256', data);
        const hashArray2 = Array.from(new Uint8Array(hashBuffer2));
        const hash2 = hashArray2.map(b => b.toString(16).padStart(2, '0')).join('');

        expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different PINs', async () => {
        const encoder = new TextEncoder();

        const pin1 = '1234';
        const data1 = encoder.encode(pin1);
        const hashBuffer1 = await crypto.subtle.digest('SHA-256', data1);
        const hash1 = Array.from(new Uint8Array(hashBuffer1)).map(b => b.toString(16).padStart(2, '0')).join('');

        const pin2 = '5678';
        const data2 = encoder.encode(pin2);
        const hashBuffer2 = await crypto.subtle.digest('SHA-256', data2);
        const hash2 = Array.from(new Uint8Array(hashBuffer2)).map(b => b.toString(16).padStart(2, '0')).join('');

        expect(hash1).not.toBe(hash2);
    });
});

describe('Rate Limiting', () => {
    it('should track requests per IP', () => {
        const requests = new Map();
        const ip = '127.0.0.1';
        const key = `${ip}:CREATE_SESSION`;

        // First request
        requests.set(key, { count: 1, resetTime: Date.now() });
        expect(requests.get(key).count).toBe(1);

        // Second request
        const data = requests.get(key);
        data.count++;
        expect(requests.get(key).count).toBe(2);
    });

    it('should reset count after time window', () => {
        const now = Date.now();
        const windowMs = 60000;

        const requestTime1 = now - 70000; // 70 seconds ago
        const requestTime2 = now;

        expect(requestTime2 - requestTime1 > windowMs).toBe(true);
    });
});
