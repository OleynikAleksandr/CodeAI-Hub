import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import {
  PROVIDER_STACK_TO_DESIGN_ID,
  resolveSidebarProviderIdForStage,
} from "./use-step-provider-resolver";

const RESOLVER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-step-provider-resolver.ts"
);

const baseSnapshot = (
  override: Partial<WorkflowStateSnapshot> = {}
): WorkflowStateSnapshot => ({
  workspaceSlug: "ws",
  updatedAt: "2026-04-29T00:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "idle",
    diagram_modules: "idle",
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      application_skeleton: false,
      quality_gates: false,
    },
  },
  ...override,
});

test("provider stack ids map to canonical design ids", () => {
  assert.equal(PROVIDER_STACK_TO_DESIGN_ID.claudeCodeCli, "claude");
  assert.equal(PROVIDER_STACK_TO_DESIGN_ID.codexCli, "codex");
  assert.equal(PROVIDER_STACK_TO_DESIGN_ID.kimiCode, "kimi");
});

test("trunk stage resolves to provider of latest continuity segment", () => {
  const snapshot = baseSnapshot({
    continuity: {
      chains: [
        {
          rootSessionId: "r1",
          workspaceSlug: "ws",
          stage: "virtual_simulation",
          updatedAt: "2026-04-29T01:00:00.000Z",
          segments: [
            {
              sessionId: "s1",
              providerId: "claudeCodeCli",
              providerSessionId: "ps1",
              createdAt: "2026-04-29T00:30:00.000Z",
            },
          ],
        },
      ],
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "virtual_simulation", "codex"),
    "claude"
  );
});

test("trunk stage resolves Kimi continuity segment to Kimi design id", () => {
  const snapshot = baseSnapshot({
    continuity: {
      chains: [
        {
          rootSessionId: "r1",
          workspaceSlug: "ws",
          stage: "diagram_modules",
          updatedAt: "2026-04-29T01:00:00.000Z",
          segments: [
            {
              sessionId: "s1",
              providerId: "kimiCode",
              providerSessionId: "ps1",
              createdAt: "2026-04-29T00:30:00.000Z",
            },
          ],
        },
      ],
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "diagram_modules", "codex"),
    "kimi"
  );
});

test("description stage uses primarySession when no chain exists", () => {
  const snapshot = baseSnapshot({
    description: {
      updatedAt: "2026-04-29T00:00:00.000Z",
      primarySession: {
        providerId: "claudeCodeCli",
        providerSessionId: "ps",
        jsonlPath: "/tmp/p.jsonl",
      },
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "description", "codex"),
    "claude"
  );
});

test("idle stage with no chain returns null when no fallback is provided", () => {
  const snapshot = baseSnapshot();
  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "diagram_modules"),
    null
  );
});

test("idle stage with no chain falls back to explicit fallback when provided", () => {
  const snapshot = baseSnapshot();
  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "diagram_modules", "claude"),
    "claude"
  );
});

test("null snapshot returns null for any stage when no fallback is provided", () => {
  assert.equal(resolveSidebarProviderIdForStage(null, "description"), null);
});

test("null snapshot honors explicit fallback when provided", () => {
  assert.equal(
    resolveSidebarProviderIdForStage(null, "description", "claude"),
    "claude"
  );
});

test("when multiple chains exist, latest updatedAt wins", () => {
  const snapshot = baseSnapshot({
    continuity: {
      chains: [
        {
          rootSessionId: "r1",
          workspaceSlug: "ws",
          stage: "diagram_modules",
          updatedAt: "2026-04-29T01:00:00.000Z",
          segments: [
            {
              sessionId: "s1",
              providerId: "claudeCodeCli",
              providerSessionId: "ps1",
              createdAt: "2026-04-29T00:30:00.000Z",
            },
          ],
        },
        {
          rootSessionId: "r2",
          workspaceSlug: "ws",
          stage: "diagram_modules",
          updatedAt: "2026-04-29T02:00:00.000Z",
          segments: [
            {
              sessionId: "s2",
              providerId: "codexCli",
              providerSessionId: "ps2",
              createdAt: "2026-04-29T01:30:00.000Z",
            },
          ],
        },
      ],
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "diagram_modules", "claude"),
    "codex"
  );
});

test("idle virtual_simulation does NOT inherit from description (strict per-step attribution)", () => {
  const snapshot = baseSnapshot({
    description: {
      updatedAt: "2026-04-29T00:00:00.000Z",
      primarySession: {
        providerId: "claudeCodeCli",
        providerSessionId: "ps",
        jsonlPath: "/tmp/p.jsonl",
      },
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "virtual_simulation"),
    null,
    "VS without own chain stays neutral even when Description has Claude"
  );
});

test("idle diagram_modules does NOT inherit from virtual_simulation chain", () => {
  const snapshot = baseSnapshot({
    continuity: {
      chains: [
        {
          rootSessionId: "r1",
          workspaceSlug: "ws",
          stage: "virtual_simulation",
          updatedAt: "2026-04-29T01:00:00.000Z",
          segments: [
            {
              sessionId: "s1",
              providerId: "codexCli",
              providerSessionId: "ps1",
              createdAt: "2026-04-29T00:30:00.000Z",
            },
          ],
        },
      ],
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "diagram_modules"),
    null,
    "DM without own chain stays neutral even when VS has Codex"
  );
});

test("idle diagram_modules does NOT fall back to description either", () => {
  const snapshot = baseSnapshot({
    description: {
      updatedAt: "2026-04-29T00:00:00.000Z",
      primarySession: {
        providerId: "codexCli",
        providerSessionId: "ps",
        jsonlPath: "/tmp/p.jsonl",
      },
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "diagram_modules"),
    null,
    "DM without own chain stays neutral even when Description has Codex"
  );
});

test("fresh workspace with no chains and no description returns null for all trunk stages", () => {
  const snapshot = baseSnapshot();
  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "description"),
    null
  );
  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "virtual_simulation"),
    null
  );
  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "diagram_modules"),
    null
  );
});

test("branch resolvers always return null until per-branch sessions exist", async () => {
  const source = await readFile(RESOLVER_SOURCE_PATH, "utf8");
  assert.equal(
    source.includes("forBranchPart: () => null"),
    true,
    "forBranchPart must return null for v1 (no per-branch session attribution)"
  );
  assert.equal(
    source.includes("forBranchCluster: () => null"),
    true,
    "forBranchCluster must return null for v1"
  );
  assert.equal(
    source.includes("forBranchModule: () => null"),
    true,
    "forBranchModule must return null for v1"
  );
  assert.equal(
    source.includes("const branchDefault"),
    false,
    "legacy diagram_modules-inheritance for branch nodes must be removed"
  );
});

test("unknown provider id in chain falls back through chain selection", () => {
  const snapshot = baseSnapshot({
    continuity: {
      chains: [
        {
          rootSessionId: "r1",
          workspaceSlug: "ws",
          stage: "virtual_simulation",
          updatedAt: "2026-04-29T01:00:00.000Z",
          segments: [
            {
              sessionId: "s1",
              providerId: "legacyProvider",
              providerSessionId: "ps1",
              createdAt: "2026-04-29T00:30:00.000Z",
            },
          ],
        },
      ],
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "virtual_simulation", "codex"),
    "codex"
  );
});
