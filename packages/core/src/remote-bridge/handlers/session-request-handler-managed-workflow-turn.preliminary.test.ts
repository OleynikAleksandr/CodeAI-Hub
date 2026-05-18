import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import { SessionRequestHandlerManagedWorkflowTurn } from "./session-request-handler-managed-workflow-turn";

const WORKSPACE_SLUG = "demo-workspace";
const DESCRIPTION_STAGE = "description";
const VIRTUAL_SIMULATION_STAGE = "virtual_simulation";
const USER_REVIEW_RE =
  /Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки/u;
const CONFIRMATION_RE = /нажмите кнопку «Подтверждаю» ниже/u;
const DESCRIPTION_REVIEW_RE =
  /Core: Description перешёл в пользовательскую проверку/u;
const VIRTUAL_SIMULATION_REVIEW_RE =
  /Core: Virtual Simulation перешёл в пользовательскую проверку/u;

interface CapturedCoreMessage {
  readonly content: string;
  readonly tag: string;
}

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createHandler = (params: {
  readonly stage: typeof DESCRIPTION_STAGE | typeof VIRTUAL_SIMULATION_STAGE;
  readonly workspaceRoot: string;
}): {
  readonly coreMessages: CapturedCoreMessage[];
  readonly handler: SessionRequestHandlerManagedWorkflowTurn;
  readonly sessionId: string;
} => {
  const coreMessages: CapturedCoreMessage[] = [];
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    params.workspaceRoot,
    "provider-session-1",
    { initiativeSlug: WORKSPACE_SLUG, stage: params.stage }
  );
  const handler = new SessionRequestHandlerManagedWorkflowTurn({
    eventMessages: {
      appendCoreMessage: (_sessionId: string, message: CapturedCoreMessage) => {
        coreMessages.push(message);
      },
    },
    getMessageDispatch: () =>
      ({
        sendInternalMessage: () => Promise.resolve(),
      }) as never,
    sessionManager,
  });
  return { coreMessages, handler, sessionId: session.id };
};

test("managed workflow turn emits preliminary review handoffs", async () => {
  const cases = [
    {
      expected: DESCRIPTION_REVIEW_RE,
      prepare: (workspaceRoot: string) =>
        writeWorkspaceFile(
          workspaceRoot,
          `.codeai-hub/${WORKSPACE_SLUG}/description/Final_Description.md`,
          "# Final Description\n\nReady for Virtual Simulation.\n"
        ),
      stage: DESCRIPTION_STAGE,
    },
    {
      expected: VIRTUAL_SIMULATION_REVIEW_RE,
      prepare: (workspaceRoot: string) =>
        writeWorkspaceFile(
          workspaceRoot,
          `.codeai-hub/${WORKSPACE_SLUG}/virtual_simulation/virtual-simulation.md`,
          "# Virtual Simulation: Demo Workspace\n\n## Scenario 1\nReady for Diagram Modules.\n"
        ),
      stage: VIRTUAL_SIMULATION_STAGE,
    },
  ] as const;

  for (const testCase of cases) {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), `preliminary-review-${testCase.stage}-`)
    );
    try {
      await testCase.prepare(workspaceRoot);
      const { coreMessages, handler, sessionId } = createHandler({
        stage: testCase.stage,
        workspaceRoot,
      });

      await handler.handleTurnCompleted(sessionId);

      assert.equal(coreMessages.at(-1)?.tag, "managed-workflow-user-review");
      assert.match(coreMessages.at(-1)?.content ?? "", testCase.expected);
      assert.match(coreMessages.at(-1)?.content ?? "", USER_REVIEW_RE);
      assert.match(coreMessages.at(-1)?.content ?? "", CONFIRMATION_RE);
    } finally {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  }
});
