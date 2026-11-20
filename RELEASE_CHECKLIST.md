# Memory Grove v1 release checklist

## Completed in this build

- [x] Zero external runtime dependencies, no mandatory backend/API accounts
- [x] Browser IndexedDB encrypted data, originals and unfinished drafts
- [x] Append-only events for committed changes and readable history
- [x] AES-GCM round-trip and tamper/wrong-password tests
- [x] Full encrypted backup + atomic fresh restore + additive family merge and tamper/duplicate tests
- [x] Multilingual keyword search + transcript and timestamp link models
- [x] Illustrated landing, trees, lineage, people, chronology, records, albums, settings, assistant and capture views
- [x] Automated Chromium and WebKit end-to-end testing of family setup, relationships, story/media entry, offline search, archive encryption/restore/merge, draft recovery and offline use
- [x] Fake-device microphone and camera `MediaRecorder` capture tested in Chromium
- [x] Desktop and mobile screenshot rendering with zero JavaScript errors in static UI interaction checks
- [x] Responsive layout inspected at desktop and 390px phone width without overflow
- [x] PWA manifest, icons and offline service worker shell
- [x] Public privacy notice and transparent limits

## Reliability safeguards added in v1.2

- [x] Database media/draft writes await transaction completion, not only request success
- [x] Local vault integrity check verifies original bytes, event identities and referenced attachments
- [x] Export checks the encrypted originals before preparing a backup
- [x] Recording finalization prevents early story publication or locking
- [x] Multi-chapter planting is an atomic event batch

Browser automation is not the same as hands-on Safari on a real iPhone. The following are deliberately still **not** checked.

## Must be completed on physical phones before publicly promoting as fully tested

- [ ] On an actual iPhone in Safari over HTTPS: create a vault, close browser, reopen and unlock it.
- [ ] Install to Home Screen; confirm data behavior between browser and installed app; restore an encrypted archive where necessary.
- [ ] Record and play back audio through the built-in microphone; reject permission and retry.
- [ ] Record and play back camera video; verify codec/container, orientation and metadata on the intended Safari/iOS version.
- [ ] Test long recordings and 250 MB segment limit without losing audio; verify storage quota warnings and manual original recovery.
- [ ] Import multiple photos, add captions, close app with a draft and confirm it is restored.
- [ ] Test mobile automatic-download preference; if Safari blocks it, confirm the manual original-download button works and make the limitation clear in onboarding.
- [ ] Confirm the deployed website opens offline after an initial online visit, including after Home Screen installation.
- [ ] Download encrypted `.grove` archive, restore it onto another actual device, compare original media checksums and transcripts.
- [ ] Complete a two-person family exchange: both add distinct memories, merge in both directions, ensure no data disappears.
- [ ] Check hostile cases: wrong password, corrupted archive, insufficient disk space, browser private mode, page backgrounding mid-capture, lost/moved file.
- [ ] Accessibility review with VoiceOver, enlarged text, keyboard and contrast.
- [ ] Independent security review if marketing this for large-scale public preservation of irreplaceable private footage.

**Release decision:** The software is ready to run and self-host as an open-source local-first PWA, but calling it fully production-validated for unbacked irreplaceable family media requires the unchecked tasks.

## Original Indian miniature-inspired edition (1.1)

- [ ] Check desktop, iPhone narrow viewport, iPad layout for the new folio illustration and text wrapping.
- [ ] Confirm the illustrated garden loads offline after the first complete installation.
- [ ] Confirm a dedicated hosting origin for sensitive family data rather than sharing a hostname with unrelated web projects.
