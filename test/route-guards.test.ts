import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Every admin-side API handler must call a guard: a new route without one would expose data.
const ROOTS = ["src/app/api/projects", "src/app/api/admin"];
const GUARD = /\b(requireProject|requireUser|requireAdmin)\(/g;
const HANDLER = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)\b/g;

function routes(dir: string): string[] {
  let out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(routes(p));
    else if (e === "route.ts") out.push(p);
  }
  return out;
}

describe("admin API route guards", () => {
  const files = ROOTS.flatMap(routes);
  it("finds the project routes", () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    it(`${f} guards every handler`, () => {
      const src = readFileSync(f, "utf8");
      const handlers = src.match(HANDLER)?.length ?? 0;
      const guards = src.match(GUARD)?.length ?? 0;
      expect(handlers).toBeGreaterThan(0);
      expect(guards).toBeGreaterThanOrEqual(handlers);
    });
  }
});
