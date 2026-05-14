import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { Logger } from "../../telemetry/logger";
import { sendDiagramModulesContinuationIfReady } from "./diagram-modules-continuation-dispatcher";
import { WorkflowAgentAcceptanceFeedback } from "./workflow-agent-acceptance-feedback";

const createChains = (
  stage: ContinuityChainSummary["stage"],
  sessionId: string
): readonly ContinuityChainSummary[] => [
  {
    rootSessionId: `codex-${stage}`,
    segments: [
      {
        createdAt: "2026-05-08T05:51:54.053Z",
        providerId: "codexCli",
        providerSessionId: `provider-${sessionId}`,
        sessionId,
      },
    ],
    stage,
    updatedAt: "2026-05-08T05:51:54.053Z",
    workspaceSlug: "demo-workspace",
  },
];

const createLogger = (): {
  readonly logger: Logger;
  readonly warnings: Array<{
    readonly message: string;
    readonly payload?: Record<string, unknown>;
  }>;
} => {
  const warnings: Array<{
    readonly message: string;
    readonly payload?: Record<string, unknown>;
  }> = [];
  return {
    logger: {
      warn: (message, payload) => {
        warnings.push({ message, payload });
      },
    } as Logger,
    warnings,
  };
};

const createGateway = (): {
  readonly messages: string[];
  readonly turnStarts: string[];
} & Parameters<
  WorkflowAgentAcceptanceFeedback["sendDiagramModulesFeedback"]
>[0]["gateway"] => {
  const messages: string[] = [];
  const turnStarts: string[] = [];
  return {
    handleMessage: (sessionId, payload) => {
      const text =
        typeof payload === "string"
          ? payload
          : (payload as { readonly content?: string }).content;
      messages.push(`${sessionId}\n${text ?? ""}`);
      return Promise.resolve();
    },
    markFeedbackTurnStarted: (sessionId) => {
      turnStarts.push(sessionId);
    },
    messages,
    turnStarts,
  };
};

test("managed provider feedback does not send Diagram Modules messages during rewrite", async () => {
  const { logger, warnings } = createLogger();
  const gateway = createGateway();

  await new WorkflowAgentAcceptanceFeedback(logger).sendDiagramModulesFeedback({
    chains: createChains("diagram_modules", "diagram-session"),
    gateway,
    progress: {
      aggregateReady: true,
      generatedCount: 1,
      generatedPartIds: ["local-runtime"],
      plannedCount: 1,
      plannedPartIds: ["local-runtime"],
      substep: "awaiting_review",
    },
    workspaceRoot: "/tmp/demo-workspace",
    workspaceSlug: "demo-workspace",
  });

  assert.deepEqual(gateway.messages, []);
  assert.deepEqual(gateway.turnStarts, []);
  assert.deepEqual(warnings, [
    {
      message:
        "Managed workflow provider feedback dispatch is disabled while the managed workflow orchestration cluster is being rewritten.",
      payload: { stage: "diagram_modules", workspaceSlug: "demo-workspace" },
    },
  ]);
});

test("managed provider feedback does not send Application Skeleton or Quality Gates messages", async () => {
  const { logger } = createLogger();
  const gateway = createGateway();
  const feedback = new WorkflowAgentAcceptanceFeedback(logger);

  await feedback.sendApplicationSkeletonFeedback({
    chains: createChains("application_skeleton", "skeleton-session"),
    gateway,
    progress: null,
    workspaceRoot: "/tmp/demo-workspace",
    workspaceSlug: "demo-workspace",
  });
  await feedback.sendQualityGatesFeedback({
    chains: createChains("quality_gates", "quality-session"),
    gateway,
    progress: null,
    workspaceRoot: "/tmp/demo-workspace",
    workspaceSlug: "demo-workspace",
  });

  assert.deepEqual(gateway.messages, []);
  assert.deepEqual(gateway.turnStarts, []);
});

test("Diagram Modules continuation dispatcher remains no-op during rewrite", async () => {
  const gateway = createGateway();

  await sendDiagramModulesContinuationIfReady({
    chains: createChains("diagram_modules", "diagram-continuation-session"),
    gateway,
    progress: {
      acceptedPartIds: ["project-manager"],
      activeSubturn: {
        kind: "product_part",
        partId: "local-runtime",
        status: "pending",
      },
      aggregateReady: false,
      currentPartId: "local-runtime",
      expectedArtifactPath:
        ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
      generatedCount: 1,
      generatedPartIds: ["project-manager"],
      plannedCount: 2,
      plannedPartIds: ["project-manager", "local-runtime"],
      substep: "generate_product_part",
    },
    workspaceRoot: "/tmp/demo-workspace",
    workspaceSlug: "demo-workspace",
  });

  assert.deepEqual(gateway.messages, []);
  assert.deepEqual(gateway.turnStarts, []);
});
