# Security & family data stewardship

Memory Grove is designed to be privacy-preserving and local-first, not to replace professional archival or security services.

## What the app defends against

- An untrusted party reading exported `.grove` bytes or browser IndexedDB ciphertext **without** the passphrase.
- Accidental destructive edits in the application UI: committed records are append-only and corrections are added as new events.
- Passive off-device collection by this app: there is no backend, analytics, account endpoint or third-party remote AI integration.
- Accidental online speech recognition: the optional dictation button requires browser-confirmed `processLocally: true` support.

## What it cannot defend against

- Loss of an encryption passphrase, an erased browser profile, broken phone, quota eviction or missing independent backups.
- A malicious/compromised website version, device, browser, extension, or someone using a known passphrase.
- Deletion of selected ciphertext rows by a person with full device access, or intentional modifications of a local copy by an archive holder.
- Genuine access-control roles, revocation, automatic sync or signed append-only attestations without additional identity/key infrastructure.
- Huge video archives that exhaust browser quota or memory.

## Cryptography details

- AES-256-GCM via Web Crypto. Unique random 96-bit IV per encrypted event/asset/draft.
- PBKDF2 with SHA-256, 310,000 iterations, random 128-bit per-vault salt.
- A fixed authenticated verifier is encrypted at vault creation to validate passphrase entry.
- Event payload, contributor name (private preference), draft, media bytes and media filenames (as event data) are encrypted.
- Public metadata (the presence of an archive, encrypted record IDs, cryptographic parameters and archive export time) is not encrypted.
- Exported archives package encrypted records as JSON containing base64 ciphertext; they can be transferred without decrypting. Import-to-existing-vault re-encrypts plaintext in memory under the destination key after verification.
- No passphrases or raw AES keys are persisted. Keys remain in JavaScript memory until the app locks/unloads. Closing the app removes runtime keys but not exported unencrypted files.

This is a practical privacy design, not a formal audit or security guarantee.

## Best practices for families

1. Use a long, unique passphrase and store it somewhere safe with a trusted family steward.
2. Create an encrypted backup immediately after a major interview, and routinely thereafter; verify one on another device/browser before depending on it.
3. Preserve the automatically downloaded original recordings separately from the encrypted archive if you choose that mode, and ensure those copies remain private.
4. Share archive files and passphrases using separate trusted channels. Anyone with both can access the data; you cannot remotely revoke an already-shared copy.
5. Do not place `.grove` backups, personal photos, audio or transcripts into the public static GitHub repository.
6. Test mobile media recording, storage and restore before trusting the PWA with an irreplaceable interview.

For the public privacy notice, visit `privacy.html` in the deployed app.

## Hosting origin isolation

Different URL paths on one hostname share the same IndexedDB origin. In particular, public GitHub Pages project sites under the same `username.github.io` hostname share origin even if they come from separate repositories. For sensitive family data, deploy this app to a hostname used only for Memory Grove, keep the hosting account secure, and do not embed untrusted scripts on that origin.
