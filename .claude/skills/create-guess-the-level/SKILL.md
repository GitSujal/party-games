---
name: create-guess-the-level
description: Create levels (questions) for the Guess The game in this repo. Each level is an answer plus 1 to 5 picture or short video clues in a category such as Movie, Actor, Word, Phrase or Sports Person. Finds clue images online first (Wikimedia photos of famous people and landmarks, Twemoji emoji, letter and text cards), finds short clips for actions, and generates images or videos with the user's local API only as a last resort. Use when the user wants to add, write, generate, import or bulk-create Guess The questions or levels, find or add clue images or videos, or add a new "Guess the ..." category.
---

# Create Guess The levels

A **level** is one question: an answer, optional accepted aliases, and 1–5 clues shown in
order. A clue is a picture or a short silent looping video (for actions). Levels live in `src/games/guess-the/content/guess-the-<category>.json` (server-only,
secret) and clue files (images and MP4s) in `public/games/guess-the/<category>/` (public).

You never need to order or shuffle levels. The server deals them randomly from a shuffle bag
that lasts for the whole room: within a game nothing repeats, and across Play again / Back to
lobby every question in the chosen categories is used before any repeats. So just add levels.

## Workflow

### 1. Gather the levels

For each level, pin down:
- **Category**: one of the ids in `src/games/guess-the/categories.ts` (`movie`, `actor`, `word`, `phrase`, `sports-person`, …).
- **Answer**: exactly as it should appear on the TV at reveal, properly cased ("The Lion King").
- **Aliases** (`--accept`): only what the matcher would NOT already accept (see below). Nicknames ("The Rock"), surname or first name alone for famous people ("Messi"), abbreviations ("LOTR", "SRK"), and alternate or translated titles.
- **Clues** (1–5): where the images come from (see step 2).

If the user gives only answers, propose the clues yourself and confirm before creating many.

### 2. Clues: find before you make

Find real images first. Generate only when nothing suitable exists. Pick per clue, in this order:

| Clue is… | Use | Clue syntax |
|---|---|---|
| The user's own picture | their file | `./path/to/photo.jpg` |
| An emoji ("🍕", "👩‍🍳", "🇳🇵") | Twemoji, open-licensed SVG; credit added automatically | `"emoji:🍕"` |
| A letter, number or symbol ("A", "7", "&") | big letter card | `"text:A"` |
| A word, short phrase or fact ("Butter", "9.58 seconds") | text card | `"text:Butter"` |
| A famous person, landmark, place, animal, artwork, flag, or everyday object or scene | **web image** via `find-image.mjs` | the image URL |
| An action or motion ("diving", "moonwalk", "a cannonball splash") | **web video** via `find-image.mjs --video`, trimmed to the action | the video URL + `@start-end` |
| Something no photo shows (e.g. "a dog wearing a crown in the rain") | **generate an image** with the local API | `"gen-image:<prompt>"` |
| An action no free clip shows | **generate a video** with the local API | `"gen-video:<prompt>"` |

**Finding a web image**
```bash
node .claude/skills/create-guess-the-level/find-image.mjs "Eiffel Tower"
node .claude/skills/create-guess-the-level/find-image.mjs "ice cube" --limit 8
```
It checks Wikidata first (the canonical photo of a person or landmark), then searches Wikimedia
Commons. Each candidate lists its license, author, a 960px `url` and a ready-made `--credit`.
Everything on Commons is free to use with that credit. Then:
1. **Look at it before using it.** Download a candidate to the scratchpad (`curl -sA "PartyGamesLevels/1.0" -o "$SCRATCH/c.jpg" "<url>"`) and Read it. Check that it's the right subject, clear at TV size, free of a caption or watermark naming the answer, and the right difficulty for that clue position.
2. Pass the `url` as the clue and its `--credit` string to `add-level.mjs`. The script **downloads** the image and stores it under an opaque name. Never reference a web URL directly: clue URLs reach the phones before the reveal, and names like `Eiffel_Tower.jpg` give the answer away.

If Wikimedia has nothing good, a general web search (WebSearch / WebFetch) is fine for finding an image, but **only use it if the license allows reuse**: public domain, CC0, CC BY or CC BY-SA, or an explicit free license such as Unsplash or Pexels. Record its credit. Don't use stock-photo previews, press photos, movie posters, album art or anything without a clear license. If that leaves you stuck, describe the subject with an emoji or text clue, or generate an image.

**Video clues** (actions)
```bash
node .claude/skills/create-guess-the-level/find-image.mjs "slow motion diving" --video
```
Pass the video `url` with `@start-end` (in seconds) to cut it to the action, e.g. `"https://…/diving.webm@0.5-3.5"`.
Aim for 3–8 seconds. Every video, and every GIF, becomes a **silent**, metadata-free H.264 MP4 that fits within
1280×720 and starts fast; the game plays it muted and looping. The script prints a **frame sheet** (8 frames on one
PNG): Read it before keeping the clip, and check for captions, scoreboards, name bibs and logos. Clips over 3 MB get a
warning. No YouTube, TikTok or other platform rips: only free-licensed clips (Commons) or the user's own.

**Generating** (last resort) uses the user's local API at `http://localhost:8000` (Qwen Image for pictures, MiniMax H3
for video). Its full reference is `docs/API.md` in the user's `imagegen` project (`C:/Users/sujal/Documents/static_repo/Personal/imagegen`).
It must be running. If the script says it isn't, ask the user to open ComfyUI Desktop and run `uv run serve` in that
folder. Never start it yourself.

| | `gen-image:<prompt>` | `gen-video:<prompt>` |
|---|---|---|
| Output | 512×512 picture | 480p square clip (640×640), used at that size; picture stream copied as-is |
| Time | ~15–30 s | ~1–2 min for 2–4 s; longer clips cost more (`--video-seconds 1–10`, default 4) |
| Model | `official` (family-friendly weights, never the uncensored default) | `official`, speed `fast` |
| Sound | n/a | the generated soundtrack is **removed** (it could speak the answer) |

- Prompt for **one clear subject or action**, a simple setting and a static or simple camera. The script appends a "no text, letters, captions, logos" instruction. Check the result anyway, because the model renders text well.
- The model may not follow the prompt exactly: a "cannonball" came out as a dive in testing. Check that the frame sheet actually shows the clue you meant.
- `--keyframe <image>` (up to 4; a file or URL) pins video frames in order: 1 = first frame, 2 = first and last, and so on. Use it to animate a real photo, e.g. a Wikimedia picture as frame 1. Keyframes are centre-cropped to square first.
- Generations are saved to the temp folder (the path is printed). After a `--dry-run`, pass that saved file as a normal clue instead of generating again.
- Generated media needs no credit.
- For anything the script doesn't cover (edits with reference images, the prompt enhancer, continuing a clip), call the API directly per its reference, save the file to the scratchpad and pass the path.

**Credits**: every `--credit` goes into the level's `credits` list. The TV shows credits in small type **at the reveal only**, because they can name the subject. Twemoji credit is added automatically. Use the credit string `find-image.mjs` prints; for other sources write `Photo: <author> / <site>, <license>`.

Good clue design:
- **Order clues from hardest to easiest.** The first clue alone should be hard; the last should nearly give it away.
- **Each clue points to the answer only in combination.** No single clue should be the answer itself: no posters with the title, no photo of the actor's face for Guess the Actor (use their roles instead).
- **Never let a clue name the answer.** The script stores images under opaque names, strips JPEG/PNG text metadata (EXIF, XMP, IPTC, comments) and rejects text and SVG clues that contain the answer or an alias. It can't read pixels, so check images yourself for captions, signs, jersey names and watermarks.
- Mix clue types for variety: a photo, an emoji and a letter can all point to one answer.
- Landscape or square works best (the TV shows clues side by side); portrait is letterboxed. Keep images under ~400 KB (big JPEGs and PNGs are shrunk automatically) and videos under ~3 MB.
- Use at most one or two video clues per level, because every phone downloads them.

### 3. Add each level with the script

```bash
node .claude/skills/create-guess-the-level/add-level.mjs <category> "<answer>" \
  [--accept "<alias>"]... [--credit "<attribution>"]... [--keyframe <image>]... [--video-seconds N] <clue>...
```

Clue forms: a file path or URL (image or video), `<video>@<start>-<end>`, `"emoji:…"`, `"text:…"`,
`"gen-image:<prompt>"`, `"gen-video:<prompt>"`.

Examples:
```bash
node .claude/skills/create-guess-the-level/add-level.mjs word "Pancake" "text:Pan" "text:Cake"
node .claude/skills/create-guess-the-level/add-level.mjs movie "Ratatouille" "emoji:🐀" "emoji:👨‍🍳" \
  "https://thumb.wikimedia.org/…/960px-Tour_Eiffel_Wikimedia_Commons.jpg" \
  --credit "Image: Benh LIEU SONG / Wikimedia Commons (Public domain)"
node .claude/skills/create-guess-the-level/add-level.mjs sports-person "Cristiano Ronaldo" --accept "Ronaldo" --accept "CR7" \
  "emoji:🇵🇹" "text:7" ./photos/stadium.jpg --dry-run
```

The script:
- picks the next id (`m5`, `w5`, …);
- downloads web images, videos and Twemoji, copies local files, renders text cards and calls the local API for `gen-*` clues, storing everything under opaque names;
- converts videos to silent MP4 and prints a frame sheet for each one;
- appends the entry, credits included, to the JSON.

It refuses unknown categories, duplicate answers, a clue count outside 1–5, missing files, URLs
that return a page instead of an image, and text or SVG clues that give the answer away. Use
`--dry-run` to fetch and check without writing. For bulk work, run it once per level; don't
hand-edit ids.

Hand-editing the JSON is fine for fixing typos, aliases or credits. Each entry looks like
`{ "id": "m5", "answer": "…", "accept": ["…"], "images": ["movie/m5-1.jpg"], "credits": ["…"] }`.
Image paths are relative to `public/games/guess-the/`.

### What the matcher already accepts (don't add these as aliases)

`matchesAnswer` in `src/platform/mechanics/answers.ts` ignores case, accents, punctuation,
spaces, `&`/"and", and a leading "the/a/an". It also allows typos by answer length (letters,
spaces excluded): ≤3 → 0, 4–6 → 1, 7–12 → 2, 13+ → 3. So "lion kng" already matches
"The Lion King". Watch for **short answers** that sit within a typo or two of a different
common word: for example, "Up" accepts only "up". If a wrong answer would wrongly match, say so to the user.

### 4. A new category (only if asked)

1. Add `{ id: 'kebab-id', name: 'Display Name' }` to `CATEGORIES` in `src/games/guess-the/categories.ts`. The prompt becomes "Guess the <name>", and a host on/off setting appears automatically.
2. Create `src/games/guess-the/content/guess-the-<id>.json` with `{ "questions": [] }`, then add levels with the script.
3. Make sure the category has at least a few levels before shipping. A test fails if the JSON files and `CATEGORIES` don't match.

## Verify (all must pass before reporting done)

```bash
npm test          # content test: every category has a file, 1–5 images, no answer in image paths
npm run build
node -e "for (const f of require('fs').readdirSync('src/games/guess-the/content')) for (const q of require('./src/games/guess-the/content/'+f).questions) console.log(q.answer)" > "$SCRATCH/answers.txt"
grep -rliFf "$SCRATCH/answers.txt" dist/client   # must print nothing
```

(`$SCRATCH` is your scratchpad directory.) Very short answers like "Up" can false-positive in
minified JS. If grep hits, open the match and confirm it isn't the content.

Look at every new image (Read the file) and every video's frame sheet before reporting. Then tell the user how many
levels were added per category, and list any that have a weak clue or a risky short answer.
Deploy only when the user asks (`npm run deploy`).
