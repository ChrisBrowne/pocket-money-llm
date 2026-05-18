import { readFileSync, existsSync } from "fs";

// Read the running version at startup. Resolution order (per ADR-0036):
//   1. VERSION env var — for future CI-built artifacts that strip .git
//   2. .git/HEAD (and refs / packed-refs as needed) — current git-pull deploy
//   3. "unknown" — fallback when neither is available
function readVersion(): string {
  if (process.env.VERSION) return process.env.VERSION;

  try {
    const head = readFileSync(".git/HEAD", "utf-8").trim();

    // Detached HEAD: contains the SHA directly.
    if (!head.startsWith("ref: ")) {
      return head.slice(0, 7);
    }

    // Symbolic ref: try the unpacked ref file first.
    const refPath = head.slice("ref: ".length);
    const unpackedRefFile = `.git/${refPath}`;
    if (existsSync(unpackedRefFile)) {
      return readFileSync(unpackedRefFile, "utf-8").trim().slice(0, 7);
    }

    // Fall back to packed-refs (after `git gc` or `git pack-refs`).
    const packedRefs = readFileSync(".git/packed-refs", "utf-8");
    for (const line of packedRefs.split("\n")) {
      if (line.endsWith(" " + refPath)) {
        return line.slice(0, 7);
      }
    }
  } catch {
    // .git missing, or any unexpected read failure
  }

  return "unknown";
}

export const VERSION = readVersion();
