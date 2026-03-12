import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DescriptionStepStore } from "./description-step-store";

const buildStatePath = (workspaceRoot: string, workspaceSlug: string): string =>
  path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    "description",
    "description-step.json"
  );

test("DescriptionStepStore.read keeps collector session refs when workspaceRoot has trailing slash", async () => {
  const workspaceSlug = "codeai-hub";
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codeai-hub-ws-"));

  try {
    const statePath = buildStatePath(workspaceRoot, workspaceSlug);
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(
      statePath,
      `${JSON.stringify(
        {
          workspaceSlug,
          workspacePath: workspaceRoot,
          createdAt: "2026-02-14T12:00:00.000Z",
          updatedAt: "2026-02-14T12:00:00.000Z",
          collectorSession: {
            providerId: "codexCli",
            providerSessionId: "019c5bbe-ece9-7832-8edc-b7c546f12e63",
            jsonlPath: "/tmp/dialog.jsonl",
            dialogSessionId: "codex-abc-collector",
          },
          sessionKind: "collector",
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const store = new DescriptionStepStore();
    const snapshot = await store.read(`${workspaceRoot}/`, workspaceSlug);

    assert.equal(snapshot?.sessionKind, "collector");
    assert.equal(snapshot?.collectorSession?.providerId, "codexCli");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DescriptionStepStore.read falls back to workspaceRoot when snapshot workspacePath is non-absolute for collector snapshot", async () => {
  const workspaceSlug = "codeai-hub";
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codeai-hub-ws-"));

  try {
    const statePath = buildStatePath(workspaceRoot, workspaceSlug);
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(
      statePath,
      `${JSON.stringify(
        {
          workspaceSlug,
          // Simulates older/bad snapshot content.
          workspacePath: workspaceSlug,
          createdAt: "2026-02-14T12:00:00.000Z",
          updatedAt: "2026-02-14T12:00:00.000Z",
          collectorSession: {
            providerId: "codexCli",
            providerSessionId: "019c5bbe-ece9-7832-8edc-b7c546f12e63",
            jsonlPath: "/tmp/dialog.jsonl",
            dialogSessionId: "codex-abc-collector",
          },
          sessionKind: "collector",
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const store = new DescriptionStepStore();
    const snapshot = await store.read(workspaceRoot, workspaceSlug);

    assert.equal(snapshot?.workspacePath, path.resolve(workspaceRoot));
    assert.equal(snapshot?.collectorSession?.providerId, "codexCli");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DescriptionStepStore.upsert mirrors legacy session slot into primarySession", async () => {
  const workspaceSlug = "codeai-hub";
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codeai-hub-ws-"));

  try {
    const store = new DescriptionStepStore({
      clock: () => "2026-02-28T18:00:00.000Z",
    });

    const snapshot = await store.upsert(workspaceRoot, workspaceSlug, {
      collectorSession: {
        providerId: "claudeCodeCli",
        providerSessionId: "collector-session-1",
        jsonlPath: "/tmp/collector-session-1.jsonl",
      },
      sessionKind: "collector",
    });

    assert.equal(
      snapshot.primarySession?.providerSessionId,
      "collector-session-1"
    );
    assert.equal(
      snapshot.collectorSession?.providerSessionId,
      "collector-session-1"
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DescriptionStepStore.read clears primarySession on workspace mismatch", async () => {
  const workspaceSlug = "codeai-hub";
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codeai-hub-ws-"));

  try {
    const statePath = buildStatePath(workspaceRoot, workspaceSlug);
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(
      statePath,
      `${JSON.stringify(
        {
          workspaceSlug,
          workspacePath: "/tmp/another-workspace",
          createdAt: "2026-02-14T12:00:00.000Z",
          updatedAt: "2026-02-14T12:00:00.000Z",
          primarySession: {
            providerId: "codexCli",
            providerSessionId: "legacy-primary",
            jsonlPath: "/tmp/legacy-primary.jsonl",
          },
          sessionKind: "collector",
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const store = new DescriptionStepStore();
    const snapshot = await store.read(workspaceRoot, workspaceSlug);

    assert.equal(snapshot?.primarySession, undefined);
    assert.equal(snapshot?.sessionKind, undefined);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DescriptionStepStore.read warns when snapshot JSON is corrupted", async () => {
  const workspaceSlug = "codeai-hub";
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codeai-hub-ws-"));

  try {
    const statePath = buildStatePath(workspaceRoot, workspaceSlug);
    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(statePath, "{invalid-json", "utf8");

    const warnings: Array<{
      readonly message: string;
      readonly context?: Record<string, unknown>;
    }> = [];
    const store = new DescriptionStepStore({
      logger: {
        warn(message, context) {
          warnings.push({ message, context });
        },
      },
    });

    const snapshot = await store.read(workspaceRoot, workspaceSlug);

    assert.equal(snapshot, null);
    assert.equal(warnings.length, 1);
    assert.equal(
      warnings[0]?.message,
      "Failed to read description step snapshot"
    );
    assert.equal(warnings[0]?.context?.filePath, statePath);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
