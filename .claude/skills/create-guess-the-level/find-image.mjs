#!/usr/bin/env node
/**
 * Find free-licensed images (or short videos) on Wikimedia for a Guess The clue.
 *
 *   node .claude/skills/create-guess-the-level/find-image.mjs "<query>" [--limit 6] [--video]
 *
 * 1. Wikidata: the canonical image (P18), or video (P10) with --video, of the best-matching
 *    entities. Best for famous people, landmarks, animals, objects and places ("Eiffel Tower", "Usain Bolt").
 * 2. Commons: a file search for anything else ("hammer", "ice cube", "night sky", "slow motion diving").
 *
 * Everything on Commons is freely licensed. Each candidate prints the license, the author,
 * a URL to pass to add-level.mjs (960px for images; the original file for videos, which
 * add-level converts to a silent MP4 and can trim with @start-end), and a ready-made --credit string.
 */
const UA = 'PartyGamesLevels/1.0 (https://partygames.datasparta.com)';
const args = process.argv.slice(2);
const limitAt = args.indexOf('--limit');
const limit = limitAt >= 0 ? Number(args.splice(limitAt, 2)[1]) || 6 : 6;
const videoAt = args.indexOf('--video');
const video = videoAt >= 0 && args.splice(videoAt, 1).length === 1;
const query = args.join(' ').trim();
if (!query) {
    console.error('Usage: find-image.mjs "<query>" [--limit 6] [--video]');
    process.exit(1);
}

async function api(host, params) {
    const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${host} → ${res.status}`);
    return res.json();
}

const strip = html => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// 1. Wikidata entities → their image (P18) or video (P10) file names.
const prop = video ? 'P10' : 'P18';
const fromWikidata = [];
const search = await api('www.wikidata.org', { action: 'wbsearchentities', search: query, language: 'en', limit: '3', type: 'item' });
const ids = search.search.map(s => s.id);
if (ids.length) {
    const ents = await api('www.wikidata.org', { action: 'wbgetentities', ids: ids.join('|'), props: 'claims|labels|descriptions', languages: 'en' });
    for (const id of ids) {
        const e = ents.entities[id];
        const file = e?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
        if (file) fromWikidata.push({ title: `File:${file}`, via: `Wikidata ${id}: ${e.labels?.en?.value ?? ''} (${e.descriptions?.en?.value ?? 'no description'})` });
    }
}

// 2. Commons file search.
const filetype = video ? 'filetype:video' : 'filetype:bitmap|drawing';
const found = await api('commons.wikimedia.org', { action: 'query', list: 'search', srsearch: `${query} ${filetype}`, srnamespace: '6', srlimit: String(limit) });
const fromCommons = found.query.search.map(r => ({ title: r.title, via: 'Commons search' }));

// Dedupe, then fetch license + a 960px rendition for each.
const seen = new Set();
const candidates = [...fromWikidata, ...fromCommons].filter(c => !seen.has(c.title) && seen.add(c.title)).slice(0, limit + fromWikidata.length);
if (!candidates.length) {
    console.log(`No Wikimedia ${video ? 'videos' : 'images'} for "${query}". Try a broader query, a web search for a free-licensed one, or generate one.`);
    process.exit(0);
}
const info = await api('commons.wikimedia.org', {
    action: 'query',
    titles: candidates.map(c => c.title).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '960',
});
const pages = Object.fromEntries((info.query.pages ?? []).map(p => [p.title, p]));

let n = 0;
for (const c of candidates) {
    const ii = pages[c.title.replace(/_/g, ' ')]?.imageinfo?.[0] ?? pages[c.title]?.imageinfo?.[0];
    if (!ii) continue;
    const meta = ii.extmetadata ?? {};
    const license = strip(meta.LicenseShortName?.value) || 'unknown license';
    const artist = strip(meta.Artist?.value) || 'Unknown author';
    const pd = /public domain|cc0|pd/i.test(license);
    const kind = video ? 'Video' : 'Photo';
    console.log(`\n[${++n}] ${c.title}`);
    console.log(`    via:     ${c.via}`);
    console.log(`    size:    ${ii.width}×${ii.height} ${ii.mime}${ii.duration ? ` · ${ii.duration.toFixed(1)} s` : ''} · ${(ii.size / 1048576).toFixed(1)} MB`);
    console.log(`    license: ${license}  ·  author: ${artist}`);
    // For videos the thumbnail is a still frame; the clue needs the original file.
    console.log(`    url:     ${video ? ii.url : (ii.thumburl ?? ii.url)}`);
    if (video && ii.thumburl) console.log(`    still:   ${ii.thumburl}`);
    console.log(`    page:    ${ii.descriptionurl}`);
    console.log(`    credit:  --credit "${pd ? `${video ? 'Video' : 'Image'}: ${artist} / Wikimedia Commons (${license})` : `${kind}: ${artist} / Wikimedia Commons, ${license}`}"`);
}
console.log(
    video
        ? '\nPass the url to add-level.mjs (append @start-end to trim to the action). Review the frame sheet it prints before keeping the clip.'
        : '\nOpen or Read the image before using it. Pass the url to add-level.mjs; it downloads the file under an opaque name.'
);
