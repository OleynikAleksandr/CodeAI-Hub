import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Session } from "../session-manager";
import { Logger } from "../telemetry/logger";
import { MANAGED_AUDIT_FILE_SUFFIX, UnifiedSessionStorage } from "./storage";

const createSession = (workspaceRoot: string): Session => ({
  id: "session-1",
  providerId: "codexCli",
  workspacePath: workspaceRoot,
  initiativeSlug: "workspace",
  stage: "description",
  runSlug: "collector",
  continuationParentId: null,
  continuationIndex: 1,
  title: "Session",
  createdAt: "2026-04-29T12:00:00.000Z",
  updatedAt: "2026-04-29T12:00:00.000Z",
  messages: [],
  providerSessionId: "provider-session-1",
  providerSessionStatus: "ready",
});

const getSessionEntries = (
  storage: UnifiedSessionStorage
): Map<string, unknown> =>
  (storage as unknown as { readonly sessions: Map<string, unknown> }).sessions;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitUntil = async (
  condition: () => boolean,
  timeoutMs = 500
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!condition() && Date.now() < deadline) {
    await wait(10);
  }
  assert.equal(condition(), true);
};

const findAuditFiles = (root: string): string[] => {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        fullPath.endsWith(MANAGED_AUDIT_FILE_SUFFIX)
      ) {
        found.push(fullPath);
      }
    }
  };
  walk(root);
  return found;
};

test("UnifiedSessionStorage keeps entry until writer close settles", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "unified-storage-close-")
  );
  const storage = new UnifiedSessionStorage({
    rootDirectory: workspaceRoot,
    logger: new Logger("error"),
  });
  const session = createSession(workspaceRoot);
  const entries = getSessionEntries(storage);

  storage.register(session);
  await storage.appendMessage(session.id, {
    id: "message-1",
    role: "assistant",
    content: "hello",
    sessionId: session.id,
    timestamp: "2026-04-29T12:01:00.000Z",
  });

  storage.close(session.id, "test-close");

  assert.equal(entries.has(session.id), true);
  await waitUntil(() => !entries.has(session.id));
});

test("UnifiedSessionStorage appends managed audit records to a sibling .audit.jsonl file", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "unified-storage-audit-")
  );
  const storage = new UnifiedSessionStorage({
    rootDirectory: workspaceRoot,
    logger: new Logger("error"),
  });
  const session = createSession(workspaceRoot);

  storage.register(session);
  await storage.appendManagedAuditRecord({
    sessionId: session.id,
    record: {
      kind: "managed_corrective",
      source: "core",
      text: "Core has not yet finalized the draft.",
      timestamp: "2026-04-29T12:02:00.000Z",
    },
  });
  await storage.appendManagedAuditRecord({
    sessionId: session.id,
    record: {
      kind: "managed_post_turn_decision",
      source: "core",
      text: "Handoff to user phase.",
      timestamp: "2026-04-29T12:02:01.000Z",
    },
  });

  const auditFiles = findAuditFiles(workspaceRoot);
  assert.equal(auditFiles.length, 1);
  const auditPath = auditFiles[0] ?? "";
  assert.ok(auditPath.endsWith(MANAGED_AUDIT_FILE_SUFFIX));
  const lines = readFileSync(auditPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  assert.equal(lines.length, 2);
  const records = lines.map(
    (line) => JSON.parse(line) as Record<string, unknown>
  );
  assert.equal(records[0]?.kind, "managed_corrective");
  assert.equal(records[0]?.source, "core");
  assert.equal(records[1]?.kind, "managed_post_turn_decision");
});

test("UnifiedSessionStorage skips managed audit append for unknown sessions", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "unified-storage-audit-unknown-")
  );
  const storage = new UnifiedSessionStorage({
    rootDirectory: workspaceRoot,
    logger: new Logger("error"),
  });

  await storage.appendManagedAuditRecord({
    sessionId: "missing-session",
    record: {
      kind: "managed_corrective",
      source: "core",
      text: "ignored",
      timestamp: "2026-04-29T12:03:00.000Z",
    },
  });

  assert.deepEqual(findAuditFiles(workspaceRoot), []);
});
