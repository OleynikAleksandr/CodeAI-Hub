import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { Logger } from "../../telemetry/logger";
import { WorkflowAgentAcceptanceFeedback } from "./workflow-agent-acceptance-feedback";

const execFileAsync = promisify(execFile);
const CORE_OWNED_DIRTY_GATE_RE = /Core-owned managed commit is pending/u;
const COMMIT_OR_CLEAN_RE = /Commit or clean/u;
const PLAN_COMMIT_COMMAND_RE =
  /npm run plan:commit|current managed plan command/u;

const stringifyFeedbackPayload = (payload: unknown): string =>
  typeof payload === "string"
    ? payload
    : ((payload as { readonly content?: string }).content ?? "");

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

const initWorkspace = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
    cwd: workspaceRoot,
  });
  await mkdir(workspaceRoot, { recursive: true });
  await writeFile(path.join(workspaceRoot, "README.md"), "# Demo\n", "utf8");
  await execFileAsync("git", ["add", "README.md"], { cwd: workspaceRoot });
  await execFileAsync("git", ["commit", "-m", "test: initial"], {
    cwd: workspaceRoot,
  });
};

test("Diagram Modules feedback separates Core-owned dirty gate from artifact edits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-core-owned-dirty-")
  );
  const messages: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await new WorkflowAgentAcceptanceFeedback(
      new Logger("error")
    ).sendDiagramModulesFeedback({
      chains: createChains("diagram_modules", "diagram-session"),
      gateway: {
        handleMessage: (sessionId, content) => {
          messages.push(`${sessionId}\n${stringifyFeedbackPayload(content)}`);
          return Promise.resolve();
        },
      },
      progress: {
        aggregateReady: true,
        generatedCount: 1,
        generatedPartIds: ["local-runtime"],
        managedGitDirtyFiles: [
          ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
        ],
        plannedCount: 1,
        plannedPartIds: ["local-runtime"],
        substep: "awaiting_review",
      } as never,
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(messages.length, 1);
    assert.match(messages[0] ?? "", CORE_OWNED_DIRTY_GATE_RE);
    assert.doesNotMatch(messages[0] ?? "", COMMIT_OR_CLEAN_RE);
    assert.doesNotMatch(messages[0] ?? "", PLAN_COMMIT_COMMAND_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
