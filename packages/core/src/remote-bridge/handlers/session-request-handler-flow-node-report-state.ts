import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import type { BridgeEvent } from "../types";
import type {
  FlowNodeContinuityCreateReportRequestState,
  FlowNodeRolloverNotification,
} from "./session-continuity-rollover-orchestrator";

const MAX_CONTINUITY_RESUME_REPORT_BODY_CHARS = 8000;

interface SessionRequestHandlerFlowNodeReportStateDependencies {
  readonly broadcaster: (event: BridgeEvent) => void;
}

export class SessionRequestHandlerFlowNodeReportState {
  private readonly deps: SessionRequestHandlerFlowNodeReportStateDependencies;
  private readonly createReportRequests = new Map<
    string,
    FlowNodeContinuityCreateReportRequestState
  >();

  constructor(deps: SessionRequestHandlerFlowNodeReportStateDependencies) {
    this.deps = deps;
  }

  getCreateReportRequest(
    sessionId: string
  ): FlowNodeContinuityCreateReportRequestState | null {
    return this.createReportRequests.get(sessionId) ?? null;
  }

  deleteCreateReportRequest(sessionId: string): void {
    this.createReportRequests.delete(sessionId);
  }

  registerCreateReportRequest(options: {
    readonly sessionId: string;
    readonly requestId: string;
    readonly attempt: number;
    readonly reportPath: string;
    readonly tmpReportPath: string;
  }): void {
    const timestamp = new Date().toISOString();
    this.createReportRequests.set(options.sessionId, {
      requestId: options.requestId,
      attempt: options.attempt,
      stage: "waiting_for_report",
      reportPath: options.reportPath,
      tmpReportPath: options.tmpReportPath,
      createdAtIso: timestamp,
      updatedAtIso: timestamp,
    });
  }

  markWaitingForReport(
    sessionId: string,
    requestId: string,
    attempt: number
  ): void {
    this.updateRequest(sessionId, requestId, {
      attempt,
      stage: "waiting_for_report",
    });
  }

  markCompleted(sessionId: string, requestId: string): void {
    this.updateRequest(sessionId, requestId, { stage: "completed" });
  }

  emitFlowNodeRolloverNotification(
    sessionId: string,
    notification: Omit<FlowNodeRolloverNotification, "timestamp">
  ): void {
    this.deps.broadcaster({
      type: "session:stream",
      payload: {
        sessionId,
        event: {
          ...notification,
          timestamp: new Date().toISOString(),
        } satisfies FlowNodeRolloverNotification,
      },
    });
  }

  emitContinuityFailedEvent(options: {
    readonly sessionId: string;
    readonly providerId: string | null;
    readonly providerSessionId: string | null;
    readonly request: FlowNodeContinuityCreateReportRequestState;
    readonly reason: "report_timeout" | "unknown";
    readonly errorMessage: string;
  }): void {
    this.deps.broadcaster({
      type: "session:stream",
      payload: {
        sessionId: options.sessionId,
        event: {
          type: "stream_event",
          provider: "core",
          sessionId: options.sessionId,
          data: {
            kind: "continuity_failed",
            reason: options.reason,
            error: options.errorMessage,
            requestId: options.request.requestId,
            attempt: options.request.attempt,
            stage: options.request.stage,
            reportPath: options.request.reportPath,
            tmpReportPath: options.request.tmpReportPath,
            ...(options.providerId ? { providerId: options.providerId } : {}),
            ...(options.providerSessionId
              ? { providerSessionId: options.providerSessionId }
              : {}),
          },
          uuid: `${crypto.randomUUID()}::continuity_failed`,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  isContinuityReportTimeoutError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.startsWith("Timed out waiting for continuity report:")
    );
  }

  async loadContinuityResumeReportBody(reportPath: string): Promise<string> {
    try {
      const content = await readFile(reportPath, "utf8");
      return this.truncateContinuityResumeReportBody(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.truncateContinuityResumeReportBody(
        `Failed to read continuity report from disk (${reportPath}): ${message}`
      );
    }
  }

  private updateRequest(
    sessionId: string,
    requestId: string,
    patch: Partial<
      Pick<FlowNodeContinuityCreateReportRequestState, "attempt" | "stage">
    >
  ): void {
    const request = this.createReportRequests.get(sessionId);
    if (!(request && request.requestId === requestId)) {
      return;
    }
    this.createReportRequests.set(sessionId, {
      ...request,
      attempt: patch.attempt ?? request.attempt,
      stage: patch.stage ?? request.stage,
      updatedAtIso: new Date().toISOString(),
    });
  }

  private truncateContinuityResumeReportBody(value: string): string {
    const normalized = value.trim();
    if (normalized.length <= MAX_CONTINUITY_RESUME_REPORT_BODY_CHARS) {
      return normalized;
    }
    return [
      normalized.slice(0, MAX_CONTINUITY_RESUME_REPORT_BODY_CHARS),
      "",
      "[...truncated...]",
    ].join("\n");
  }
}
