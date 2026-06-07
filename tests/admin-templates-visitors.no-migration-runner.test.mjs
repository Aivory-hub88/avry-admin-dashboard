// Feature: admin-templates-visitors, Guardrail: no migration runner
//
// Spec: admin-templates-visitors (Req 20.2, 20.3, 20.4, 20.5)
//
// Enforces the "migrations are committed SQL files only" contract. The
// application MUST NOT execute migrations at build, deploy, or runtime, MUST
// NOT invoke `supabase db push`, and MUST NOT expose `db:push` / `migrate`
// package.json scripts.
//
// Run with:   node --test aivory-admin/tests/admin-templates-visitors.no-migration-runner.test.mjs
// Or:         cd aivory-admin && node --test tests/admin-templates-visitors.no-migration-runner.test.mjs
//
// This uses Node's built-in test runner so no extra test framework is
// required. This file is the implementation of Task 9.2 from tasks.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const TESTS_DIR = path.dirname(__filename);
const AIVORY_ADMIN_ROOT = path.resolve(TESTS_DIR, "..");

// Patterns that would indicate a migration apply path. Each entry must have
// zero matches across the tracked aivory-admin source tree.
const FORBIDDEN_PATTERNS = [
  /supabase\s+db\s+push/i,
  /supabase\s+migration\s+up/i,
  /\brunMigrations\s*\(/,
  /\bapplyMigrations\s*\(/,
  /\bmigrate\s*\(\s*\)/,
];

// Directories to skip entirely when walking the tree.
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".idea",
  "tests", // the guardrail test itself references the forbidden strings
  "supabase", // the migration files are the artifacts, not the runner
]);

// File extensions to search. SQL files are artifacts, not execution paths,
// and are excluded from the grep (we still check the rest of the tree).
const INCLUDED_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".sh",
]);

function walk(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), acc);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (INCLUDED_EXTS.has(ext)) {
        acc.push(path.join(dir, entry.name));
      }
    }
  }
  return acc;
}

test("Req 20: no migration runner or supabase db push anywhere in aivory-admin source", () => {
  const files = walk(AIVORY_ADMIN_ROOT, []);
  const violations = [];

  for (const file of files) {
    const relPath = path.relative(AIVORY_ADMIN_ROOT, file);
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({ file: relPath, pattern: pattern.source });
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Found migration-runner violations (Req 20):\n${violations
      .map((v) => `  ${v.file}  matched  /${v.pattern}/`)
      .join("\n")}`
  );
});

test("Req 20: package.json has no db:push / migrate scripts", () => {
  const pkgPath = path.join(AIVORY_ADMIN_ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const scripts = pkg.scripts ?? {};
  const forbidden = Object.keys(scripts).filter((name) =>
    /^(db:push|db:migrate|migrate|supabase:push|supabase:migrate)$/i.test(name)
  );
  assert.deepEqual(
    forbidden,
    [],
    `package.json must not define migration-apply scripts. Found: ${forbidden.join(
      ", "
    )}`
  );
});

test("Req 20: both migration SQL files exist under supabase/migrations", () => {
  const migrationsDir = path.join(AIVORY_ADMIN_ROOT, "supabase", "migrations");
  assert.ok(
    fs.existsSync(migrationsDir),
    `Expected migrations directory at ${migrationsDir}`
  );
  const files = fs.readdirSync(migrationsDir);
  const hasTemplates = files.some((f) => /create_automation_templates\.sql$/.test(f));
  const hasVisits = files.some((f) => /create_page_visits\.sql$/.test(f));
  assert.ok(hasTemplates, "Expected a *_create_automation_templates.sql migration file");
  assert.ok(hasVisits, "Expected a *_create_page_visits.sql migration file");
});
