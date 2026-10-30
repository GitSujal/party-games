/**
 * Public list of categories. Each one has a secret question file at
 * `content/guess-the-<id>.json` (server-only) and becomes an on/off setting.
 * To add a category: add its JSON file and one line here.
 */
export const CATEGORIES = [
    { id: 'movie', name: 'Movie' },
    { id: 'actor', name: 'Actor' },
    { id: 'nepali-surnames', name: 'Nepali Surnames' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

/** Settings key that switches a category on or off. */
export const categoryKey = (id: string) => `category:${id}`;
