import { defineMeta } from '../../platform/sdk';

export default defineMeta({
    id: 'momo-massacre',
    name: 'The Momo Massacre',
    tagline: 'A hosted murder mystery at a Christmas dinner.',
    description:
        'A hosted murder-mystery dinner party. Everyone gets a character with a backstory, a secret and an alibi. The host narrates the evening, reveals clues as the investigation unfolds, and the table works out who poisoned the Momo King.',
    mark: '/games/momo-massacre/mark.svg',
    players: { min: 3, max: 14 },
    duration: '1.5–2.5 hrs',
    tags: ['Murder mystery', 'Hosted', 'Role-play'],
    theme: { color: '#A8321F' },
    features: { photo: true },
    settings: [
        {
            key: 'aiPortraits',
            label: 'AI character portraits',
            type: 'boolean',
            default: true,
            help: "Turns each player's selfie into a portrait of their character (needs image generation configured).",
        },
    ],
});
