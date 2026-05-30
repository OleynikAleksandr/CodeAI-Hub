import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { Session } from "../../session-manager";
import { openQualityGatesNextAcceptedReviewPhase } from "./quality-gates-review-decision-flow";

const CONTRACT_DRAFTING_RE = /opens contract drafting/u;
const CONTRACT_JSON_RE = /quality-gates\.json/u;
const INTEGRATION_PROMPT_RE = /Phase 3 Quality Gates Integration/u;

test("Quality Gates research acceptance opens contract drafting before integration", async () => {
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "qg-review-"));
  const sent: string[] = [];
  const coreMessages: string[] = [];
  const userTurns: Array<{
    readonly content: string;
    readonly hiddenUserMessage: boolean;
    readonly sessionId: string;
  }> = [];
  const session = {
    id: "session-1",
    initiativeSlug: "demo-workspace",
    workspacePath,
  } as Session;
  try {
    await mkdir(
      path.join(
        workspacePath,
        ".codeai-hub",
        "demo-workspace",
        "quality_gates"
      ),
      { recursive: true }
    );

    await openQualityGatesNextAcceptedReviewPhase(session, {
      eventMessages: {
        appendCoreMessage: (_sessionId, payload) => {
          coreMessages.push(payload.content);
        },
      },
      messageDispatch: {
        dispatchUserMessage: (options) => {
          userTurns.push({
            content: options.content,
            hiddenUserMessage: options.hiddenUserMessage,
            sessionId: options.sessionId,
          });
          sent.push(options.content);
          return Promise.resolve();
        },
        sendInternalMessage: (_sessionId, content) => {
          sent.push(content);
          return Promise.resolve();
        },
      },
      stagePlan: {} as QualityGatesStagePlanController,
    });

    assert.equal(sent.length, 1);
    assert.match(sent[0] ?? "", CONTRACT_DRAFTING_RE);
    assert.deepEqual(coreMessages, []);
    assert.deepEqual(userTurns, [
      {
        content: sent[0] ?? "",
        hiddenUserMessage: false,
        sessionId: session.id,
      },
    ]);
    assert.match(userTurns[0]?.content ?? "", CONTRACT_JSON_RE);
    assert.doesNotMatch(sent[0] ?? "", INTEGRATION_PROMPT_RE);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});
