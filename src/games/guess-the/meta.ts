import { defineMeta } from '../../platform/sdk';

// Catalog card + configuration. Everything here is public.
export default defineMeta({
    id: 'guess-the',
    name: 'Guess The',
    tagline: 'Read the picture clues and name it before anyone else.',
    description:
        'Each question shows one to five picture clues: guess the movie, the actor or the Nepali surname (the host picks the categories). Type your answer on your phone. Correct answers score points, with a bonus for speed. The big screen reveals the answer once everyone is in.',
    players: { min: 1, max: 20 },
    duration: '10–20 min',
    tags: ['Quiz', 'Pictures', 'Quick'],
    theme: { color: '#B4442B' },
    settings: [
        { key: 'questions', label: 'Questions', type: 'number', default: 10, min: 1, max: 50 },
        {
            key: 'answerSeconds',
            label: 'Answer timer',
            type: 'number',
            default: 45,
            min: 0,
            max: 180,
            step: 15,
            unit: 'seconds',
            help: 'The answer is revealed when it runs out. 0 turns the timer off.',
        },
    ],
});
