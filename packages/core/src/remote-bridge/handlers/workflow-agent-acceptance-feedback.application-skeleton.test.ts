import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { Logger } from "../../telemetry/logger";
import { WorkflowAgentAcceptanceFeedback } from "./workflow-agent-acceptance-feedback";

const WORKSPACE_SLUG = "demo-workspace";
const MISPLACED_PRODUCT_PART =
  ".codeai-hub/demo-workspace/product-parts/project-manager/README.md";

const createChains = (): readonly ContinuityChainSummary[] => [
  {
    rootSessionId: "codex-application_skeleton",
    segments: [
      {
        createdAt: "2026-05-11T16:03:10.000Z",
        providerId: "codexCli",
        providerSessionId: "provider-skeleton-session",
        sessionId: "skeleton-session",
      },
    ],
    stage: "application_skeleton",
    updatedAt: "2026-05-11T16:03:10.000Z",
    workspaceSlug: WORKSPACE_SLUG,
  },
];

const stringifyFeedbackPayload = (payload: unknown): string =>
  typeof payload === "string"
    ? payload
    : ((payload as { readonly content?: string }).content ?? "");

test("Application Skeleton feedback is disabled during orchestration rewrite", async () => {
  const messages: string[] = [];

  await new WorkflowAgentAcceptanceFeedback(
    new Logger("error")
  ).sendApplicationSkeletonFeedback({
    chains: createChains(),
    gateway: {
      handleMessage: (sessionId, content) => {
        messages.push(`${sessionId}\n${stringifyFeedbackPayload(content)}`);
        return Promise.resolve();
      },
    },
    progress: {
      accepted: true,
      managedGitOutOfOwnerDirtyFiles: [MISPLACED_PRODUCT_PART],
      mapExists: true,
      mappingReady: true,
      markdownExists: true,
      materializationState: "failed",
      materialized: false,
      observedMaterialization: true,
      substep: "failed",
      validationErrors: [
        "application skeleton codePath is missing: product-parts/project-manager",
      ],
    } as never,
    workspaceRoot: "/tmp",
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.equal(messages.length, 0);
});

test("Application Skeleton repairable boundary feedback stays no-op during rewrite", async () => {
  const messages: string[] = [];

  await new WorkflowAgentAcceptanceFeedback(
    new Logger("error")
  ).sendApplicationSkeletonFeedback({
    chains: createChains(),
    gateway: {
      handleMessage: (_sessionId, content) => {
        messages.push(stringifyFeedbackPayload(content));
        return Promise.resolve();
      },
    },
    progress: {
      accepted: true,
      managedGitOutOfOwnerDirtyFiles: ["package.json"],
      mapExists: true,
      mappingReady: true,
      markdownExists: true,
      materializationState: "materialized",
      materialized: true,
      observedMaterialization: true,
      substep: "failed",
      validationErrors: [
        "Core is blocked from finalizing Application Skeleton because package.json is outside the active stage allowlist.",
      ],
    } as never,
    workspaceRoot: "/tmp",
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.equal(messages.length, 0);
});
