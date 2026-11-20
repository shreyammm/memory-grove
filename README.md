# ✿ Memory Grove

**Our stories, still growing.** A free, illustrated, offline-first family oral-history PWA. Inspired by Indian miniature and storybook illustration. Private by default; no account, analytics, paid API, database server, subscription, or app store is required. Optional local Whisper transcription needs a bundled dependency and a one-time model download.

**Version:** 1.2 Indian miniature edition · release candidate · November 20, 2026 · MIT licensed

> The application is usable now as a local-first family archive. **Before inviting the public to preserve irreplaceable memories, complete the real-device release checklist.** This package has passed automated archive/crypto/model tests and a browser-rendered desktop/mobile interface review, but it has not completed hands-on iPhone recording and restore QA or an independent security audit.

## Start using it right now

1. Download the current [GitHub release-branch ZIP](https://github.com/shreyammm/memory-grove/archive/refs/heads/main.zip) and unzip it.
2. Open Terminal in the unzipped folder and enter:

   ```bash
   cd ~/Downloads/memory-grove-main
   python3 -m http.server 8000
   ```
3. In a modern browser on that same computer, visit `http://localhost:8000`.
4. Choose a family name, the first person to remember, and a strong passphrase. Record your first story.

For the basic archive, no `npm install`, Expo Go, API key, or account is required. Optional automatic speech recognition requires `npm install && npm run build` for deployment. You must use a local web server or HTTPS (not directly open `index.html` as a file), because IndexedDB, service workers, camera/microphone and Web Crypto require appropriate browser security contexts.

### Put it on your iPhone at no cost

1. Publish the project to a dedicated free HTTPS hostname. **Cloudflare Pages is recommended** for a separate private-storage origin; follow [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) to connect the `main` branch. GitHub Pages is an alternative if the hostname is dedicated to Memory Grove.
2. On the iPhone, open your published URL in **Safari**.
3. Tap **Share → Add to Home Screen** and choose **Open as Web App** if available.
4. Launch the Memory Grove icon and create or restore your encrypted archive.

**Important:** Safari tabs, a Home Screen installation, and different browsers may maintain different website storage in some circumstances. Always move an encrypted `.grove` backup when changing installations or devices. Check which copy contains your memories before recording more.

## Recommended: dedicated free Cloudflare Pages site

Connect the standalone `shreyammm/memory-grove` repository to Cloudflare Pages following [these release-specific instructions](./CLOUDFLARE_DEPLOY.md). Choose the `main` branch, no framework or build command, and output directory `.`. It deploys the existing paintings, encrypted archive app, icons and offline worker directly to your own `*.pages.dev` domain, without a backend or build process.

Cloudflare hosting serves the **application code only**. Family originals are not uploaded by the PWA. Using a dedicated origin avoids mixing sensitive browser storage with unrelated sites on your `github.io` hostname.

## Alternative: GitHub Pages

This is plain static HTML, JavaScript, SVG and CSS. It needs **no build pipeline** and makes **no paid requests**.

1. In the standalone public `shreyammm/memory-grove` repository, go to **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**.
2. Open the Pages URL shown by GitHub (normally `https://YOUR-USERNAME.github.io/memory-grove/`). You now have a free HTTPS installable PWA.
3. Test it on the iPhone, install it to Home Screen, and complete the manual release checklist.

When you publish an update, **increase `CACHE` in `sw.js`** (e.g. `memory-grove-shell-v4`) so existing devices replace the cached app shell. Existing encrypted memories remain in that origin's browser storage as long as the site address/scope does not change. Keep backup files before upgrading.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site and https://support.apple.com/en-in/guide/iphone/iph42ab2f3a7/27/ios/27


### Privacy consideration when choosing a free host

**Web storage isolation is by origin (scheme + hostname + port), not by URL path.** A GitHub Pages project at `username.github.io/memory-grove/` shares its browser storage origin with any other website under `username.github.io/`, even if they are separate repositories. This is not the recommended long-term setup for sensitive family recordings if you also host other projects with untrusted scripts on that hostname. Prefer a **dedicated HTTPS hostname** (for example, a free dedicated `*.pages.dev` domain if deploying through Cloudflare Pages). Do not move to a different address without downloading a verified `.grove` backup first: browser storage will not automatically follow the move.

The public repository holds only application code and illustrations. **Never commit real family files or exported `.grove` archives to a public repository.**

## Features included

| Area | What works now |
|---|---|
| The illustrated grove | Original hand-composed Indian miniature-inspired folio garden with generations, peacock, lotus pond, jewel-toned frame and paper palette, responsive desktop/mobile design, daily question, growing counts |
| People | Add people, portrait photos, biographical details, birth/death dates, preserved correction history |
| Trees | Individual life trees with eight milestone branches and story blossoms, lineage and multigenerational parent-child view, partner/sibling connections |
| Timeline | Chronological story view per person (approximate dates welcome) |
| Oral histories | Live audio **and** video recording through `MediaRecorder`, import audio/video, record multiple originals per story, save originals separately |
| Photos | Import original full-resolution photos, caption each, attach to memories or profiles, photo-story prompts, browse album |
| Transcripts | Manual bilingual transcripts and optional in-browser Whisper transcription of imported media. The local model is downloaded on first use; device/browser support and long-file reliability vary. Timestamped lines jump into the original. |
| Moments and chapters | In addition to manually marked moments, locally transcribed uploads create source-grounded virtual timestamp clips categorized under life-tree branches. Suggestions are heuristic and can be imperfect; the uncut original remains. |
| Interviewing | English/Hindi question deck and contextual follow-up questions from existing typed words |
| Search | Offline, multilingual exact-word retrieval across titles, people, story text, transcript passages, notes and timestamped clips |
| Ask the Grove | Source-grounded passage retrieval with links back to originals; optional on-device summary **only** on browsers with an already-available local language model |
| Preservation | AES-256-GCM encryption with passphrase-derived key, encrypted media and draft autosave, append-only published event log, inspectable correction/version history |
| Family exchange | Encrypted `.grove` exports, restore to a fresh device, atomic append-only archive merge, duplicate checks and conflict rejection |
| Keepsakes | Human-readable Markdown export (unencrypted), encrypted complete backups including originals and drafts, optional automatic plain-original downloads |
| Installation | Service worker offline shell, installable PWA manifest/icons, self-hostable without a backend |

### What works on an iPhone vs what depends on support

Ordinary story writing, albums, local search, encrypted backup and restore, and PWA installation are designed for modern mobile browsers. Camera/microphone recording depends on permission and device/browser codec support, which must be tested on the actual target iPhone. **On-device speech recognition is not broadly supported in Safari**; the app will *not* silently use cloud transcription as a fallback. Typed/pasted transcripts work everywhere the rest of the app works.

The optional browser `LanguageModel` API is experimental and often unavailable, especially on iPhone. The baseline **offline chapter organization and source search work without an AI model**. The app does not promise automatic high-quality speech-to-text or semantic AI generation on every browser. Delivering universal local speech-to-text would require bundling and maintaining substantial on-device model files, a separate engineering step.

## How private local preservation works

- **Local encrypted vault:** `IndexedDB` stores ciphertext, not plaintext stories or original media. Your passphrase derives an AES-GCM key via PBKDF2-HMAC-SHA-256 (310,000 iterations). The key is held in runtime memory, not saved in the browser. The browser's underlying storage is still controlled by the user and OS.
- **Commit history:** Each `person.create`, `memory.create`, `memory.attach`, `memory.transcript`, `memory.revise`, `memory.moment`, `memory.note`, `relation.add` and other committed action creates a new event with an ID, timestamp and contributor. The user interface has **no delete operation** for committed records. Edits derive the current view from the full history; original events persist.
- **Drafts:** Text, people selections, and references to uploaded originals are encrypted and saved as unfinished drafts. Drafts may be replaced or cleared before/after publication; *published stories* are append-only.
- **Original media:** Uploaded photos, recordings and video are encrypted before storing; decoding happens when replaying. An opt-in preference independently downloads recordings after capture. On mobile browsers, automatic downloads can be blocked; use the manual **Save original** button.
- **Safe archive imports:** A restore or family merge commits all new originals and history entries in one IndexedDB transaction; a failed transaction does not leave a half-imported history. Validate backups on a separate device before relying on them.
- **Backup:** Download the full encrypted `.grove` archive in **Privacy & keepsakes**. Make at least two independent copies and store them somewhere safe. A readable `.md` export is also available but is **not encrypted**.
- **Family contributions:** Send an encrypted archive and passphrase separately. Family members restore or merge on their own devices. When they send the newer archive back, your import adds new events; it does not erase old ones.

## Non-negotiable limitations of a zero-backend design

1. **Not live sync.** Archive exchange is manual, not instantaneous family collaboration. Device-specific versions can diverge until they are merged.
2. **No real invitation/role enforcement.** The archive passphrase controls access to its contents, but there are no online identities, invitation revocations, viewer/contributor permissions, or server-side authorization. Anyone with a decrypted copy and control of their device can change their own version. **Do not claim roles are securely enforced.**
3. **Append-only application, not unbreakable history.** A person controlling device storage or an archive can delete or tamper with it outside the app. AES-GCM authenticates individual encrypted contents but cannot prevent an archive holder from deleting entire entries or re-encrypting data with a known passphrase. It is not a remotely anchored or digitally signed ledger.
4. **No backup recovery service.** Clearing site data or losing device/storage can erase memories. There is no lost-passphrase recovery. The browser may evict stored data. Request persistent storage if available, but still export backups.
5. **Browser quotas and working memory.** For reliability, the recorder currently stops live capture at about **245 MB** per segment, but **imported files are encrypted in 4 MB chunks** without an arbitrary per-file cap. Storage quota and browser memory still limit real-world uploads; playback may load the complete decrypted original in memory. Opening `.grove` backups above **1.2 GB** remains unsupported, so giant uploads do **not** yet have a reliable portable archive/restore pathway. Keep independent originals and do not rely on this preview for irreplaceable large media.
6. **Not a third-party security audit.** Web apps can change when a publisher updates the hosted source. Use a hosting account you trust. A compromised hosting origin, browser, extension, device or shared passphrase is outside what encryption alone can protect.
7. **Not universal offline AI.** The free fallback is deterministic indexing/structure; local model/dictation integrations are only active where supported and installed. No external AI API is used.

## Release 1.2 reliability improvements

- IndexedDB writes for media, drafts and preferences now wait for the *whole transaction* to finish, including quota errors, before reporting a successful save.
- The **Verify every saved original** action decrypts and authenticates local media and history, and flags missing originals; exporting a backup also runs this integrity check. This is *not* a substitute for a backup saved to another device.
- Publication/lock/navigation guards prevent leaving a recording while it is still being encrypted and persisted. A failed recording stays recoverable until it is explicitly resolved.
- Batch chapter creation is atomic, so a validation failure cannot plant only part of a selected batch.
- When several originals belong to one story, timestamped transcripts and source-search results now explicitly retain the correct recording ID; older transcripts still fall back to the first original.
- Automatic updates use a new offline shell cache version. The vault itself is never deleted by service-worker updates.

## Testing

From the project directory, with Node.js 22+:

```bash
npm test
```

The GitHub Actions release workflow also runs a real mobile-sized Chromium and WebKit end-to-end suite: onboarding, people and relationships, original photos/media, real microphone and camera capture in Chromium, encrypted export, restore to a fresh browser, additive family merge, draft recovery and offline unlock. This is a browser emulator test, not a substitute for physical iPhone QA.

The tests cover AES-GCM tampering/wrong passphrase, exact media bytes, encrypted backup/restore, encrypted drafts, atomic family-vault creation, additive merge/replay/conflict rejection, family tree revision derivation, Hindi/English search, chapter suggestions, visual assets and offline manifest assets. Browser-rendered desktop/mobile interface visual checks were also performed. See `RELEASE_CHECKLIST.md` for the real-device checks that are still necessary.

## Files

- `index.html` — installable app entry and restrictive content-security policy
- `app.js` — user interface, recording, chapter review, search, family and backup workflows
- `db.js`, `crypto.js` — encrypted browser archive, persistence, merge/restore
- `model.js` — event projections, life branches, search and source-faithful suggestions
- `art.js`, `styles.css`, `painting.css`, `assets/` — original miniature-inspired SVG illustrations, iconography and responsive design
- `sw.js`, `manifest.webmanifest` — offline shell and PWA installability
- `privacy.html`, `SECURITY.md`, `DATA_FORMAT.md`, `RELEASE_CHECKLIST.md` — transparency and stewardship
- `tests/` — zero-dependency Node tests

## License

MIT. Designed as a free, noncommercial gift to help families preserve memories. No dependencies or third-party image/font assets are embedded.


## Experimental long-interview processing branch (not yet production verified)

This feature branch introduces optional local Whisper-based transcription for uploaded
audio and video, timestamped virtual clips, life-branch suggestions, and chunked
encryption for importing originals over 250 MB. The source recording remains intact.
The bundled transcriber is generated with:

```sh
npm install
npm run build
```

Deploy the resulting `dist/` through the configured Cloudflare Worker.
A first-time model download (~120 MB) requires internet and available space; family
media is not intentionally uploaded to the model provider. Actual iPhone Safari
support, memory behavior for long videos, performance, and accuracy have not been
validated. Processing currently requires leaving the app open. Long-media archive
backup/restore still needs a streamable multi-volume redesign.

**Cloud sign-in and automatic cross-device synchronization are not implemented.**
The passphrase unlocks an archive already stored in the current browser; recovery on
another device still requires an exported backup. Future user-owned Google Drive
backup/sync would require an OAuth client, explicit consent, conflict-safe syncing
and recovery testing. Do not market local unlocking as account-based sign-in.
