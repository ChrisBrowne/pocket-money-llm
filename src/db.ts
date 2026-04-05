import { Database } from "bun:sqlite"

export function openDatabase(path: string): Database {
  const db = new Database(path)

  db.run("PRAGMA journal_mode = WAL")
  db.run("PRAGMA foreign_keys = ON")
  db.run("PRAGMA busy_timeout = 5000")
  db.run("PRAGMA synchronous = NORMAL")

  db.run(`
    CREATE TABLE IF NOT EXISTS children (
      name       TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      child_name  TEXT    NOT NULL REFERENCES children(name) ON DELETE CASCADE,
      kind        TEXT    NOT NULL CHECK(kind IN ('deposit', 'withdrawal')),
      amount      INTEGER NOT NULL CHECK(amount > 0),
      note        TEXT    NOT NULL DEFAULT '',
      recorded_at TEXT    NOT NULL,
      recorded_by TEXT    NOT NULL
    )
  `)

  return db
}
