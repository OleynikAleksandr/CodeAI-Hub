import assert from "node:assert/strict";
import test from "node:test";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import {
  PROVIDER_STACK_TO_DESIGN_ID,
  resolveSidebarProviderIdForStage,
} from "./use-step-provider-resolver";

const baseSnapshot = (
  override: Partial<WorkflowStateSnapshot> = {}
): WorkflowStateSnapshot => ({
  workspaceSlug: "ws",
  updatedAt: "2026-04-29T00:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "idle",
    diagram_modules: "idle",
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
    },
  },
  ...override,
});

test("provider stack ids map to canonical design ids", () => {
  assert.equal(PROVIDER_STACK_TO_DESIGN_ID.claudeCodeCli, "claude");
  assert.equal(PROVIDER_STACK_TO_DESIGN_ID.codexCli, "codex");
  assert.equal(PROVIDER_STACK_TO_DESIGN_ID.geminiCli, "gemini");
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

test("description stage uses primarySession when no chain exists", () => {
  const snapshot = baseSnapshot({
    description: {
      updatedAt: "2026-04-29T00:00:00.000Z",
      primarySession: {
        providerId: "geminiCli",
        providerSessionId: "ps",
        jsonlPath: "/tmp/p.jsonl",
      },
    },
  });

  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "description", "codex"),
    "gemini"
  );
});

test("idle stage with no chain falls back to provided fallback", () => {
  const snapshot = baseSnapshot();
  assert.equal(
    resolveSidebarProviderIdForStage(snapshot, "diagram_modules", "claude"),
    "claude"
  );
});

test("null snapshot returns fallback for any stage", () => {
  assert.equal(
    resolveSidebarProviderIdForStage(null, "description", "gemini"),
    "gemini"
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
