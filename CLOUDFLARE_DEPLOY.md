# Publish Memory Grove safely and for free

Memory Grove is a static local-first PWA. Publishing the app's source does NOT upload family memories; encrypted vault data stays in the browser unless the user explicitly exports and shares a `.grove` archive.

## Dedicated Cloudflare Pages origin

A distinct `*.pages.dev` hostname is recommended to isolate browser IndexedDB storage from your unrelated `shreyammm.github.io` websites. Apps on different paths of the same hostname share a storage origin.

### Git integration (automatic updates)

1. Open https://dash.cloudflare.com/ > Workers & Pages > Create application > Pages > Connect to Git > GitHub.
2. Grant repository access only to `shreyammm/memory-grove` and select that repository.
3. Choose a unique project name; **Production branch:** `main`.
4. Framework: None. Build command: blank. Build output directory: `.`.
5. Deploy. Visit the generated `https://<your-project>.pages.dev` URL.
6. On iPhone Safari choose Share > Add to Home Screen, then perform `RELEASE_CHECKLIST.md` before adding irreplaceable family memories.

### Direct upload (manual deployments)

If you do not want to connect your GitHub account to Cloudflare, download and unzip the [release-branch ZIP](https://github.com/shreyammm/memory-grove/archive/refs/heads/main.zip). In Cloudflare's Workers & Pages section, choose Create application > Pages > Direct Upload / Drag and drop, and upload the **unzipped project folder containing `index.html` at its top level**, not the outer GitHub ZIP as-is. Cloudflare accepts a folder of static assets. Choose Deploy site and visit the resulting `*.pages.dev` URL.

**Choose carefully:** Cloudflare does not currently allow switching an existing Direct Upload Pages project to Git integration without creating a new Pages project.

## Protect family archives

- Use the HTTPS dedicated site and a strong passphrase; record a test memory and unlock it after a browser restart.
- Export an encrypted `.grove` archive. Restore it on a different device and verify that original media plays byte-identically.
- Keep at least two independent backups of irreplaceable originals. Safari can clear site storage.
- Never push family `.grove` archives, photos or recordings to a public repository.
- There is no automatic live family sync or universal iPhone AI transcription. Family sharing is protected archive exchange; transcripts can always be typed.
