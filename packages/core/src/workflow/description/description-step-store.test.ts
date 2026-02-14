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

test("DescriptionStepStore.read keeps session refs when workspaceRoot has trailing slash", async () => {
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
          reviewerSession: {
            providerId: "codexCli",
            providerSessionId: "019c5bbe-ece9-7832-8edc-b7c546f12e63",
            jsonlPath: "/tmp/dialog.jsonl",
            dialogSessionId: "codex-abc-reviewer",
          },
          sessionKind: "reviewer",
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const store = new DescriptionStepStore();
    const snapshot = await store.read(`${workspaceRoot}/`, workspaceSlug);

    assert.equal(snapshot?.sessionKind, "reviewer");
    assert.equal(snapshot?.reviewerSession?.providerId, "codexCli");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DescriptionStepStore.read falls back to workspaceRoot when snapshot workspacePath is non-absolute", async () => {
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
          reviewerSession: {
            providerId: "codexCli",
            providerSessionId: "019c5bbe-ece9-7832-8edc-b7c546f12e63",
            jsonlPath: "/tmp/dialog.jsonl",
            dialogSessionId: "codex-abc-reviewer",
          },
          sessionKind: "reviewer",
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const store = new DescriptionStepStore();
    const snapshot = await store.read(workspaceRoot, workspaceSlug);

    assert.equal(snapshot?.workspacePath, path.resolve(workspaceRoot));
    assert.equal(snapshot?.reviewerSession?.providerId, "codexCli");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
