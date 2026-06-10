import type { Logger } from "../../telemetry/logger";
import type { ManagedWorkflowTurnCompletionResult } from "./session-request-handler-managed-workflow-turn";

const MANAGED_ARBITRATION_TIMEOUT_MS = 120_000;

// A hung managed handler must not hold "agent is working" forever.
export const runManagedArbitrationWithTimeBox = (
  deps: {
    readonly appendProviderMessage: (
      sessionId: string,
      role: "assistant" | "system" | "thinking",
      event: unknown
    ) => void;
    readonly logger: Logger;
  },
  sessionId: string,
  arbitration: Promise<ManagedWorkflowTurnCompletionResult | undefined>
): Promise<ManagedWorkflowTurnCompletionResult | undefined> =>
  Promise.race([
    arbitration,
    new Promise<ManagedWorkflowTurnCompletionResult>((resolve) => {
      const timer = setTimeout(() => {
        deps.logger.error(
          "Managed workflow turn arbitration timed out",
          new Error("managed arbitration time box elapsed"),
          { sessionId, timeoutMs: MANAGED_ARBITRATION_TIMEOUT_MS }
        );
        deps.appendProviderMessage(sessionId, "system", {
          content: [
            "Core did not finish processing this turn in time.",
            "The input is released. Send any message to continue; Core will re-validate the workflow state and dispatch the next step.",
          ].join("\n"),
        });
        resolve("settled");
      }, MANAGED_ARBITRATION_TIMEOUT_MS);
      arbitration.finally(() => clearTimeout(timer)).catch(() => undefined);
    }),
  ]);
