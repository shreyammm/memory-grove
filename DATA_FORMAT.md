# Memory Grove v1 data format

The `.grove` file is UTF-8 JSON containing ciphertext; the filename extension does **not** imply ZIP compression. The format is intentionally simple and can be converted by future open-source tools.

```json
{
  "kind": "memory-grove-backup",
  "version": 1,
  "exportedAt": "2026-11-20T00:00:00.000Z",
  "vault": {
    "kind": "memory-grove",
    "version": 1,
    "salt": "base64...",
    "iterations": 310000,
    "check": {"iv": "base64...", "data": "base64..."}
  },
  "events": [{"id": "uuid", "iv": "base64...", "data": "base64..."}],
  "assets": [{"id": "uuid", "iv": "base64...", "data": "base64..."}],
  "drafts": [{"id": "capture", "iv": "base64...", "data": "base64..."}],
  "privatePreferences": [{"id": "private-actor", "iv": "base64...", "data": "base64..."}]
}
```

- `data` is AES-256-GCM ciphertext plus authentication tag. IVs are random 12 bytes each.
- Decrypted event content: `{id, at, type, actor, payload}`. The `id` is duplicated outside the cipher to enable deduplication; restoration and merge validate that event IDs match.
- Typical event names: `family.create`, `family.revise`, `person.create`, `person.revise`, `person.photo`, `relation.add`, `memory.create`, `memory.revise`, `memory.attach`, `memory.transcript`, `memory.moment`, `memory.note`.
- Relationships are stored as `relation.add` events with `kind` `parent`, `partner` or `sibling`. For parent, person A is the parent of person B.
- Original media appears as encrypted `assets` records, referenced from encrypted event payloads by asset ID, size, MIME and original filename.
- Transcript contributions may include `assetId` to connect their timestamped lines to one specific original when a memory contains several recordings. Older transcripts without this field use the first original by default.
- Timestamp moments contain `{id: memoryId, assetId, start, end?, title, text}` with source times in seconds. A timestamped transcript line begins with `[mm:ss]` or `[hh:mm:ss]`.
- Organizers may create new memories with `sourceMemoryId` pointing back to the full, uncut original. They do not modify existing ciphertext or fabricate source time ranges.
- `drafts` may be overwritten as you type; the append-only guarantee covers **committed** contributions, not unfinished edits.
- Import-to-existing-vault ignores the source archive's draft and private local preferences to prevent overwriting the recipient's work. Fresh restore includes both.
- Archive validation rejects malformed rows, invalid passwords, conflicting event IDs or conflicting original-media IDs. It does not provide a multi-party signature or detect deliberate removal of complete records by a passphrase holder.

For substantial media archives, JSON/base64 is intentionally straightforward rather than compact. Future formats may use ZIP streams or chunked binary encoding with a migration utility.
