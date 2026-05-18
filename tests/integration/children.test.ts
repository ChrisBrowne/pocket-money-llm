import { describe, expect, test, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { openDatabase } from "../../src/db";
import {
  addChild,
  removeChild,
  listChildren,
  getChild,
  DuplicateChildError,
  ChildNotFoundError,
} from "../../src/children/commands";
import { parseChildName, parseBirthday } from "../../src/shared/types";
import {
  isOk,
  isErr,
  assertOk,
  assertErr,
  isSome,
  isNone,
} from "../../src/shared/result";
import { unlinkSync } from "node:fs";

function freshDb(): { db: Database; path: string } {
  const path = `/tmp/pm-children-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  return { db: openDatabase(path), path };
}

describe("children commands", () => {
  const dbs: { db: Database; path: string }[] = [];

  function createDb() {
    const entry = freshDb();
    dbs.push(entry);
    return entry.db;
  }

  afterEach(() => {
    for (const { db, path } of dbs) {
      db.close();
      try {
        unlinkSync(path);
      } catch {}
      try {
        unlinkSync(path + "-wal");
      } catch {}
      try {
        unlinkSync(path + "-shm");
      } catch {}
    }
    dbs.length = 0;
  });

  const alice = assertOk(parseChildName("Alice"));
  const bob = assertOk(parseChildName("Bob"));
  const aliceBday = assertOk(parseBirthday("2015-04-12"));
  const bobBday = assertOk(parseBirthday("2017-08-23"));

  test("addChild creates a child", () => {
    const db = createDb();
    const result = addChild(db, alice, aliceBday);
    expect(isOk(result)).toBe(true);
  });

  test("listChildren returns child with zero balance", () => {
    const db = createDb();
    addChild(db, alice, aliceBday);
    const children = listChildren(db);
    expect(children).toHaveLength(1);
    expect(children[0]!.name).toBe("Alice");
    expect(children[0]!.balance).toBe(0);
  });

  test("addChild rejects duplicate name", () => {
    const db = createDb();
    addChild(db, alice, aliceBday);
    const result = addChild(db, alice, aliceBday);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DuplicateChildError);
    }
  });

  test("removeChild deletes the child", () => {
    const db = createDb();
    addChild(db, alice, aliceBday);
    const result = removeChild(db, alice);
    expect(isOk(result)).toBe(true);
    expect(listChildren(db)).toHaveLength(0);
  });

  test("removeChild returns error for nonexistent child", () => {
    const db = createDb();
    const result = removeChild(db, bob);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ChildNotFoundError);
    }
  });

  test("listChildren orders by dob ascending (oldest first)", () => {
    const db = createDb();
    // Bob is younger (2017 dob) than Alice (2015 dob), insert order reversed
    addChild(db, bob, bobBday);
    addChild(db, alice, aliceBday);
    const children = listChildren(db);
    expect(children).toHaveLength(2);
    expect(children[0]!.name).toBe("Alice");
    expect(children[1]!.name).toBe("Bob");
  });

  test("listChildren breaks dob ties alphabetically by name", () => {
    const db = createDb();
    // Twins — same dob; expect alphabetical order
    addChild(db, bob, aliceBday);
    addChild(db, alice, aliceBday);
    const children = listChildren(db);
    expect(children).toHaveLength(2);
    expect(children[0]!.name).toBe("Alice");
    expect(children[1]!.name).toBe("Bob");
  });

  test("listChildren returns empty array when no children", () => {
    const db = createDb();
    expect(listChildren(db)).toHaveLength(0);
  });

  test("getChild returns Some for existing child", () => {
    const db = createDb();
    addChild(db, alice, aliceBday);
    const result = getChild(db, "Alice");
    expect(isSome(result)).toBe(true);
    if (isSome(result)) {
      expect(result.value.name).toBe("Alice");
      expect(result.value.balance).toBe(0);
    }
  });

  test("getChild returns None for nonexistent child", () => {
    const db = createDb();
    expect(isNone(getChild(db, "Nobody"))).toBe(true);
  });

  test("listChildren derives balance from transactions", () => {
    const db = createDb();
    addChild(db, alice, aliceBday);
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
       VALUES ('Alice', 'deposit', 500, 'test', ?, 'test@example.com')`,
      [now],
    );
    db.run(
      `INSERT INTO transactions (child_name, kind, amount, note, recorded_at, recorded_by)
       VALUES ('Alice', 'withdrawal', 200, 'test', ?, 'test@example.com')`,
      [now],
    );
    const children = listChildren(db);
    expect(children[0]!.balance).toBe(300);
  });
});
