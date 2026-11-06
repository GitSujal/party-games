---
name: create-guess-the-level
description: Manage the content of the Guess The game in this repo (live in Cloudflare KV and R2): create, update, replace clues of, delete and list levels (questions), and add, rename, reorder or delete categories. Each level is an answer plus 1 to 5 picture or short video clues in a category such as Movie, Actor, Word, Phrase or Sports Person. Finds clue images online first (Wikimedia photos of famous people and landmarks, Twemoji emoji, letter and text cards), finds short clips for actions, and generates images or videos with the user's local API only as a last resort. Use when the user wants to add, write, generate, import, bulk-create, edit, fix, rename, replace the image of, remove or delete Guess The questions or levels or categories, or find or add clue images or videos.
---

# Manage Guess The levels

A **level** is one question: an answer, optional accepted aliases, and 1–5 clues shown in
order. A clue is a picture or a short silent looping video (for actions). Levels live in Cloudflare KV (secret: they hold answers) and clue files (images and MP4s) in R2 (public, served at
`/api/guess-the/assets/<category>/<file>`). You change them through the Worker's admin API, so nothing is deployed: changes
appear in a room from its next game start (a question already open is unaffected).

**Which environment you are writing to.** The scripts (`scripts/guess-the-catalog.mjs`, `add-level.mjs`) target `GUESS_API`
and `ADMIN_TOKEN`, read from the environment or `.env`; with neither they use `http://localhost:5173` (run `npm run dev`
first; the token comes from `.dev.vars`). The project's `.env` may point at **production**. Before the first write of a
session, check the target (`grep '^GUESS_API' .env`, never print the token) and, if it is not localhost, tell the user and
get a clear yes. To work locally regardless: `GUESS_API=http://localhost:5173 node …`. Reads (`categories`, `levels`,
`level show`, `assets`) are safe anywhere. Never delete, rename or `--force` anything on production unless the user named it.

`seed/guess-the/` is only the starting content that `npm run deploy` loads into an empty catalog. Live edits don't change it;
`node scripts/guess-the-catalog.mjs export <file>` takes a backup.

You never need to order or shuffle levels. The server deals them randomly from a shuffle bag
that lasts for the whole room: within a game nothing repeats, and across Play again / Back to
lobby every question in the chosen categories is used before any repeats. So just add levels.

## Workflow

### 1. Gather the levels

For each level, pin down:
- **Category**: one of the ids from `node scripts/guess-the-catalog.mjs categories`.
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
Use the credit string it prints. Then:
1. **Look at it before using it.** Download a candidate to the scratchpad (`curl -sA "PartyGamesLevels/1.0" -o "$SCRATCH/c.jpg" "<url>"`) and Read it. Check that it's the right subject, clear at TV size, free of a caption or watermark naming the answer, and the right difficulty for that clue position.
2. Pass the `url` as the clue and its `--credit` string to `add-level.mjs`. The script **downloads** the image by default and stores it under an opaque name. A web URL may also be used directly as the clue `src`: the game loads it from its host. Clue URLs reach the phones before the reveal, so avoid URLs whose file names give the answer away (e.g. `Eiffel_Tower.jpg`).

If Wikimedia has nothing good, a general web search (WebSearch / WebFetch) is fine for finding an image. Record its source as the credit (`Photo: <author or site>`). If that leaves you stuck, describe the subject with an emoji or text clue, or generate an image.

**Video clues** (actions)
```bash
node .claude/skills/create-guess-the-level/find-image.mjs "slow motion diving" --video
```
Pass the video `url` with `@start-end` (in seconds) to cut it to the action, e.g. `"https://…/diving.webm@0.5-3.5"`.
Aim for 3–8 seconds. Every video, and every GIF, becomes a **silent**, metadata-free H.264 MP4 that fits within
1280×720 and starts fast; the game plays it muted and looping. The script prints a **frame sheet** (8 frames on one
PNG): Read it before keeping the clip, and check for captions, scoreboards, name bibs and logos. Clips over 3 MB get a
warning. Prefer Commons clips or the user's own footage; avoid platform rips such as YouTube or TikTok.

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

**Credits**: every `--credit` goes into the level's `credits` list. The TV shows credits in small type **at the reveal only**, because they can name the subject. Twemoji credit is added automatically. Use the credit string `find-image.mjs` prints; for other sources write `Photo: <author or site>`.

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
node .claude/skills/create-guess-the-level/add-level.mjs actor "Tom Cruise" --accept "Cruise" \
  "emoji:✈️" "text:1986" ./photos/cruise.jpg --dry-run
```

The script:
- asks the server for the next id (`m5`, `w5`, …);
- downloads web images, videos and Twemoji, copies local files, renders text cards and calls the local API for `gen-*` clues, storing everything under opaque names;
- converts videos to silent MP4 and prints a frame sheet for each one;
- uploads the clues to R2 and saves the level, credits included, to KV (rolling the uploads back if that fails).

It refuses unknown categories, duplicate answers, a clue count outside 1–5, missing files, URLs
that return a page instead of an image, and text or SVG clues that give the answer away. Use
`--dry-run` to fetch and check without writing. For bulk work, run it once per level; don't
hand-edit ids.

A level is `{ id, answer, accept, clues: [{ src: "movie/ab12cd.jpg", shape: [w, h] }], credits, updatedAt }`.

### Updating, replacing and deleting levels

Always find the level first: `node scripts/guess-the-catalog.mjs levels <category>` (ids and answers) and
`level show <category> <id>` (full JSON). Then:

| Want to… | Command |
|---|---|
| Fix the answer's spelling or casing | `level update <cat> <id> --answer "The Lion King"` |
| Add or change aliases | `level update <cat> <id> --accept "LOTR" --accept "Lord of the Rings"` (the list **replaces** the old one, so repeat the existing aliases you keep) |
| Remove all aliases / credits | `level update <cat> <id> --no-accept` / `--no-credits` |
| Fix credits | `level update <cat> <id> --credit "Photo: …" --credit "…"` (replaces the list; keep one credit per clue, same order) |
| Reorder clues, or drop one | `level update <cat> <id> --clue movie/ab12.jpg --clue movie/cd34.png` (list the `category/file` clues to keep, in the new order; a dropped clue's file is deleted unless another level uses it) |
| Replace one clue's picture | see below |
| Delete a level | `level rm <cat> <id>` (also deletes the files only it used) |

`level update` only changes what you pass and checks the result the same way adding does (duplicate answers, answer in a
file name, missing files). New `--clue` files or URLs it uploads are stored **as given**: they are not cropped to a canonical
shape or stripped of metadata. So to replace a picture:
1. Prefer re-creating the level: `level rm`, then `add-level.mjs` with the corrected clues (the id changes, which is harmless).
2. Or, if the new file is already right (a picture you shaped yourself, ≤1024px, 1:1, 4:3, 3:4 or 16:9, no metadata), pass the
   full clue list to `level update --clue …` with the existing `category/file` entries kept as they are and the new file in
   its slot, then fix `--credit` to match.

Bulk edits: loop the commands one level at a time and report each. For anything bigger, `export` first to keep a backup.

Orphaned files (uploaded but unused, e.g. from an aborted run): `assets <cat>` shows `(unused)`; `asset prune <cat>`
deletes them. `asset rm <cat> <file>` deletes one and refuses if a level still uses it (don't pass `--force` unless asked).

Other commands: `asset add`, `category add|rename|order|rm`, `export`, `import`, `seed`.

### What the matcher already accepts (don't add these as aliases)

`matchesAnswer` in `src/platform/mechanics/answers.ts` ignores case, accents, punctuation,
spaces, `&`/"and", and a leading "the/a/an". It also allows typos by answer length (letters,
spaces excluded): ≤3 → 0, 4–6 → 1, 7–12 → 2, 13+ → 3. So "lion kng" already matches
"The Lion King". Watch for **short answers** that sit within a typo or two of a different
common word: for example, "Up" accepts only "up". If a wrong answer would wrongly match, say so to the user.

### 4. Categories (only if asked)

Delete a category with `category rm <id>` (refused while it has levels). `--force` deletes its levels and files too: only with an
explicit request, after showing the user how many levels will go. Renaming changes only the display name, never the id.

New category:

1. `node scripts/guess-the-catalog.mjs category add "Display Name" [--id kebab-id]`. The prompt becomes "Guess the <name>", and the host sees a lobby switch for it automatically.
2. Add levels with the script.
3. Make sure the category has at least a few levels before players use it. (Rename with `category rename`, reorder with `category order`, delete with `category rm [--force]`.)

## Verify (all must pass before reporting done)

```bash
npm test          # store, API and game logic
npm run build
node scripts/guess-the-catalog.mjs export "$SCRATCH/catalog.json"
node -e "const c=require(process.argv[1]);for(const l of Object.values(c.levels).flat())console.log(l.answer)" "$SCRATCH/catalog.json" > "$SCRATCH/answers.txt"
grep -rliFf "$SCRATCH/answers.txt" dist/client   # must print nothing
```

(`$SCRATCH` is your scratchpad directory.) Very short answers like "Up" can false-positive in
minified JS. If grep hits, open the match and confirm it isn't the content.

Look at every new image (Read the file) and every video's frame sheet before reporting. After any change, run
`levels <category>` (and `level show` for edited ones) to confirm the live state. Then tell the user which environment you
wrote to and what changed: levels added, updated or deleted per category, and any that have a weak clue or a risky short
answer. No deploy is needed for content changes; `npm run deploy` is only for code.

## Clue shapes

`add-level.mjs` snaps every picture to 1:1, 4:3, 3:4 or 16:9 (crop if within 8%, otherwise pad), caps the long edge at 1024px and stores each clue's size with the clue (the server sends it so the TV lays clues out before they load). `seed/guess-the/` holds the starting content: after editing its files by hand, run `node scripts/guess-the-media.mjs normalize --write` (snaps them and refreshes the sizes in `seed/guess-the/catalog.json`), then `node scripts/guess-the-catalog.mjs seed`.
