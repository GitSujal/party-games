import { defineMeta } from '../../platform/sdk';

// Catalog card + configuration. Everything here is public.
export default defineMeta({
    id: '__GAME_ID__',
    name: '__GAME_NAME__',
    tagline: 'One line that sells the game.',
    description: 'A short paragraph shown on the game page. Starter game: be the fastest to tap when GO appears.',
    players: { min: 2, max: 20 },
    duration: '5 min',
    tags: ['Quick', 'Reflexes'],
    theme: { color: '#5B3FD6' },
    settings: [{ key: 'rounds', label: 'Rounds', type: 'number', default: 5, min: 1, max: 20 }],
    // Set to false to hide from the homepage while you build it.
    enabled: false,
});
