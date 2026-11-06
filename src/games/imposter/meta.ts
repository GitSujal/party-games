import { defineMeta } from '../../platform/sdk';

export default defineMeta({
    id: 'imposter',
    name: 'Imposter',
    tagline: 'Everyone knows the secret word except the imposter.',
    description:
        'Each player secretly gets the same word, except one or more imposters who get nothing. Take turns giving a one-word clue, then vote out who you think is faking it. Imposters win if they survive long enough to match the genuine players.',
    mark: '/games/imposter/mark.svg',
    players: { min: 3, max: 20 },
    duration: '10–20 min',
    tags: ['Social deduction', 'Quick', 'Voting'],
    theme: { color: '#2F49D1' },
    settings: [
        {
            key: 'imposterPercent',
            label: 'Imposters',
            type: 'number',
            default: 25,
            min: 10,
            max: 45,
            step: 5,
            unit: '% of players',
            help: 'Always at least one, and always fewer than half the group.',
        },
        {
            key: 'discussionSeconds',
            label: 'Discussion timer',
            type: 'number',
            default: 180,
            min: 0,
            max: 600,
            step: 30,
            unit: 'seconds',
            help: 'Voting opens automatically when it runs out. 0 turns the timer off.',
        },
    ],
});
