# ADR-0003: SQLite storage with JSON export format

## Status

Accepted

## Context

The app tracks money for a handful of children with perhaps a few transactions per week. Storage needs to be simple and robust. The user has a Windows host with a Backblaze-backed drive and wants backups stored on a network share mounted into the LXC. Two options were considered: SQLite and plain JSON files.

JSON files are more transparent (human-readable via `cat`) and trivial on network shares. SQLite is more robust (ACID, crash-safe) and gives free querying for the transaction ledger. For something tracking real money, even small amounts, corruption resistance matters.

## Decision

SQLite for the live application database. JSON for the export/backup format. The export endpoint serialises the full state (children + transaction ledger) to JSON. The daily cron job saves these JSON files to the network share.

## Consequences
- Live data is crash-safe and queryable
- Backups are human-readable JSON on the Backblaze-backed network share
- SQLite WAL mode should be avoided if the DB file itself is on a network mount — keep the DB local to the LXC, only the JSON exports go to the share
- Restore replaces the SQLite DB by importing from a JSON file, not by copying DB files
