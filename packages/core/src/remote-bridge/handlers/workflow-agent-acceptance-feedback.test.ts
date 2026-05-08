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
const DIAGRAM_MODULES_MISSING_PART_RE =
  /next missing or invalid Product Part is "local-runtime"/u;

const createChains = (): readonly ContinuityChainSummary[] => [
  {
    rootSessionId: "codex-diagram-modules",
    segments: [
      {
        createdAt: "2026-05-08T05:51:54.053Z",
        providerId: "codexCli",
        providerSessionId: "provider-diagram-session",
        sessionId: "diagram-session",
      },
    ],
    stage: "diagram_modules",
    updatedAt: "2026-05-08T05:51:54.053Z",
    workspaceSlug: "demo-workspace",
  },
];

const commitWorkspaceChange = async (
  workspaceRoot: string,
  relativePath: string,
  content: string,
  message: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  await execFileAsync("git", ["add", relativePath], { cwd: workspaceRoot });
  await execFileAsync("git", ["commit", "-m", message], {
    cwd: workspaceRoot,
  });
};

const initWorkspace = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
    cwd: workspaceRoot,
  });
  await commitWorkspaceChange(
    workspaceRoot,
    "README.md",
    "# Demo\n",
    "test: initial"
  );
};

test("managed feedback repeats after a repair commit leaves Diagram Modules validation failing", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-")
  );
  const messages: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    const feedback = new WorkflowAgentAcceptanceFeedback(new Logger("error"));
    const send = () =>
      feedback.sendDiagramModulesFeedback({
        chains: createChains(),
        gateway: {
          handleMessage: (sessionId, content) => {
            messages.push(`${sessionId}\n${content}`);
            return Promise.resolve();
          },
        },
        progress: {
          aggregateReady: false,
          currentPartId: "local-runtime",
          generatedCount: 0,
          generatedPartIds: [],
          plannedCount: 1,
          plannedPartIds: ["local-runtime"],
          substep: "generate_product_part",
        },
        workspaceRoot,
        workspaceSlug: "demo-workspace",
      });

    await send();
    await send();
    assert.equal(messages.length, 1);

    await commitWorkspaceChange(
      workspaceRoot,
      "repair-attempt.txt",
      "agent attempted repair\n",
      "test: repair attempt"
    );

    await send();
    await send();
    assert.equal(messages.length, 2);
    assert.match(messages[1] ?? "", DIAGRAM_MODULES_MISSING_PART_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
