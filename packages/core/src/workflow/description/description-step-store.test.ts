import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildDescriptionBranchSnapshot,
  DescriptionStepStore,
} from "./description-step-store";

const buildStatePath = (workspaceRoot: string, workspaceSlug: string): string =>
  path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    "description",
    "description-step.json"
  );

test("DescriptionStepStore.read folds legacy collector session into primarySession when workspaceRoot has trailing slash", async () => {
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

    assert.equal(snapshot?.primarySession?.providerId, "codexCli");
    assert.equal("collectorSession" in (snapshot ?? {}), false);
    assert.equal("sessionKind" in (snapshot ?? {}), false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DescriptionStepStore.read falls back to workspaceRoot when snapshot workspacePath is non-absolute for legacy collector snapshot", async () => {
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
    assert.equal(snapshot?.primarySession?.providerId, "codexCli");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DescriptionStepStore.upsert persists canonical primarySession without legacy session slots", async () => {
  const workspaceSlug = "codeai-hub";
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codeai-hub-ws-"));

  try {
    const store = new DescriptionStepStore({
      clock: () => "2026-02-28T18:00:00.000Z",
    });

    const snapshot = await store.upsert(workspaceRoot, workspaceSlug, {
      primarySession: {
        providerId: "claudeCodeCli",
        providerSessionId: "collector-session-1",
        jsonlPath: "/tmp/collector-session-1.jsonl",
      },
    });

    assert.equal(
      snapshot.primarySession?.providerSessionId,
      "collector-session-1"
    );
    const branchSnapshot = buildDescriptionBranchSnapshot(snapshot);
    assert.equal(
      branchSnapshot.session?.providerSessionId,
      "collector-session-1"
    );
    assert.equal(branchSnapshot.sessionKind, "collector");

    const persisted = JSON.parse(
      await readFile(buildStatePath(workspaceRoot, workspaceSlug), "utf8")
    ) as Record<string, unknown>;
    assert.equal("primarySession" in persisted, true);
    assert.equal("collectorSession" in persisted, false);
    assert.equal("session" in persisted, false);
    assert.equal("sessionKind" in persisted, false);
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
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const store = new DescriptionStepStore();
    const snapshot = await store.read(workspaceRoot, workspaceSlug);

    assert.equal(snapshot?.primarySession, undefined);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
