import type { Catalog } from '../../src/games/guess-the/catalog/types';
import seed from '../../seed/guess-the/catalog.json';

/** The seed content, as the room sees it after loading it from KV. */
export const catalog = seed as unknown as Catalog;
