import crypto from "node:crypto";
import type { FlowNodeContinuityFacade } from "../../flow-node-continuity/flow-node-continuity-facade";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session } from "../../session-manager";
import type {
  ContinuityLockReason,
  EmitContinuityLockEventOptions,
  FlowNodeContinuityLockContext,
} from "./session-continuity-lock-service";
import type { FlowNodeRolloverNotification } from "./session-continuity-rollover-orchestrator";
import type { SessionRequestHandlerFlowNodeReportState } from "./session-request-handler-flow-node-report-state";
import type { SessionRequestHandlerMessageDispatch } from "./session-request-handler-message-dispatch";
import type { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";

interface SessionRequestHandlerFlowNodeRolloverDependencies {
  readonly continuityRootBySessionId: Map<string, string>;
  readonly emitContinuityLockEvent: (
    options: EmitContinuityLockEventOptions
  ) => void;
  readonly emitTurnStateEvent: (options: {
    readonly sessionId: string;
    readonly state: "running" | "idle";
  }) => void;
  readonly finalizeFlowNodeContinuityLock: (options: {
    readonly sessionId: string;
    readonly reason: Extract<
      ContinuityLockReason,
      "resume_ready" | "resume_failed" | "resume_timeout"
    >;
  }) => void;
  readonly flowNodeContinuity: FlowNodeContinuityFacade;
  readonly messageDispatch: SessionRequestHandlerMessageDispatch;
  readonly providerRegistry: ProviderRegistry;
  readonly registerFlowNodeContinuityLockContext: (
    context: FlowNodeContinuityLockContext
  ) => FlowNodeContinuityLockContext;
  readonly reportState: SessionRequestHandlerFlowNodeReportState;
  readonly sessionBootstrap: SessionRequestHandlerSessionBootstrap;
}

export class SessionRequestHandlerFlowNodeRollover {
  private readonly deps: SessionRequestHandlerFlowNodeRolloverDependencies;

  constructor(deps: SessionRequestHandlerFlowNodeRolloverDependencies) {
    this.deps = deps;
  }

  async rolloverFlowNodeSession(
    session: Session,
    rollover: {
      readonly remainingPercent: number;
      readonly thresholdPercent: number;
      readonly rolloverId: string;
    },
    options?: { readonly silent: boolean }
  ): Promise<void> {
    const adapter = this.deps.providerRegistry.getAdapter(session.providerId);
    const workspaceSlug = session.initiativeSlug;
    const stageId = session.stage;
    if (!(adapter && workspaceSlug && stageId)) {
      this.deps.finalizeFlowNodeContinuityLock({
        sessionId: session.id,
        reason: "resume_failed",
      });
      return;
    }

    const runSlug = session.runSlug ?? null;
    const nodeId = runSlug ? `${stageId}/${runSlug}` : stageId;
    const role = runSlug
      ? `${runSlug.slice(0, 1).toUpperCase()}${runSlug.slice(1)}`
      : "Agent";
    const requestId = crypto.randomUUID();
    const notificationBase = {
      kind: "flow_node_rollover",
      sourceSessionId: session.id,
      providerId: session.providerId,
      stageId,
      runSlug,
      remainingPercent: rollover.remainingPercent,
      thresholdPercent: rollover.thresholdPercent,
    } as const;
    const reportPaths = this.deps.flowNodeContinuity.buildReportPaths({
      workspaceRoot: session.workspacePath,
      workspaceSlug,
      nodeId,
      role,
      providerId: session.providerId,
      timestamp: this.toSafeTimestamp(new Date().toISOString()),
    });
    this.deps.reportState.registerCreateReportRequest({
      sessionId: session.id,
      requestId,
      attempt: 1,
      reportPath: reportPaths.reportPath,
      tmpReportPath: reportPaths.tmpReportPath,
    });

    const sourceLockContext = this.deps.registerFlowNodeContinuityLockContext({
      rolloverId: rollover.rolloverId,
      sourceSessionId: session.id,
      stageId,
      runSlug,
      awaitingBootstrapTurn: false,
    });
    this.deps.emitContinuityLockEvent({
      sessionId: session.id,
      rolloverId: sourceLockContext.rolloverId,
      sourceSessionId: sourceLockContext.sourceSessionId,
      stageId: sourceLockContext.stageId,
      runSlug: sourceLockContext.runSlug,
      state: "locked",
      reason: "report_in_progress",
    });
    this.emitNotification(
      session.id,
      {
        ...notificationBase,
        phase: "create_report_sent",
        continuityRequestId: requestId,
        continuityAttempt: 1,
        reportPath: reportPaths.reportPath,
        tmpReportPath: reportPaths.tmpReportPath,
      },
      options
    );

    const createReportPrompt = this.deps.flowNodeContinuity.renderTemplate(
      "flow/continuity/create-report-code.md",
      {
        nodeId,
        role,
        reportPath: reportPaths.reportPath,
        canonicalArtifactPath: "",
      }
    );
    const wrappedCreateReportPrompt = [
      "INTERNAL: Context budget is low. Prepare continuity report and save it on disk.",
      `- Temp path: \`${reportPaths.tmpReportPath}\``,
      `- Final path: \`${reportPaths.reportPath}\``,
      "",
      createReportPrompt.trim(),
    ].join("\n");
    this.deps.reportState.markWaitingForReport(session.id, requestId, 1);
    await this.deps.messageDispatch.sendInternalMessage(
      session.id,
      wrappedCreateReportPrompt
    );
    if (!options?.silent) {
      this.deps.reportState.emitFlowNodeRolloverNotification(session.id, {
        ...notificationBase,
        phase: "waiting_for_report",
        continuityRequestId: requestId,
        continuityAttempt: 1,
        reportPath: reportPaths.reportPath,
        tmpReportPath: reportPaths.tmpReportPath,
      });
    }
    await this.deps.flowNodeContinuity.waitForReport({
      reportPath: reportPaths.reportPath,
      timeoutMs: Number.POSITIVE_INFINITY,
      pollIntervalMs: 250,
    });
    const finalAttempt = 1;
    this.deps.reportState.markCompleted(session.id, requestId);
    this.emitNotification(
      session.id,
      {
        ...notificationBase,
        phase: "report_ready",
        continuityRequestId: requestId,
        continuityAttempt: finalAttempt,
        reportPath: reportPaths.reportPath,
      },
      options
    );
    this.deps.emitTurnStateEvent({ sessionId: session.id, state: "idle" });

    const nextSession =
      await this.deps.sessionBootstrap.createAndRegisterSession({
        providerId: session.providerId,
        workspacePath: session.workspacePath,
        adapter,
        resumeMode: "resume_via_rollover",
        silent: options?.silent === true,
        context: {
          initiativeSlug: workspaceSlug,
          stage: stageId,
          runSlug: session.runSlug,
          providerSessionId: null,
        },
        rootSessionId:
          this.deps.continuityRootBySessionId.get(session.id) ?? session.id,
        continuationParentId: session.id,
      });
    if (!nextSession) {
      this.deps.finalizeFlowNodeContinuityLock({
        sessionId: session.id,
        reason: "resume_failed",
      });
      return;
    }

    const targetLockContext = this.deps.registerFlowNodeContinuityLockContext({
      rolloverId: rollover.rolloverId,
      sourceSessionId: session.id,
      targetSessionId: nextSession.id,
      stageId,
      runSlug,
      awaitingBootstrapTurn: true,
    });
    this.emitNotification(
      session.id,
      {
        ...notificationBase,
        phase: "new_session_created",
        continuityRequestId: requestId,
        continuityAttempt: finalAttempt,
        nextSessionId: nextSession.id,
      },
      options
    );
    this.deps.emitContinuityLockEvent({
      sessionId: nextSession.id,
      rolloverId: targetLockContext.rolloverId,
      sourceSessionId: targetLockContext.sourceSessionId,
      targetSessionId: targetLockContext.targetSessionId,
      stageId: targetLockContext.stageId,
      runSlug: targetLockContext.runSlug,
      state: "locked",
      reason: "resume_bootstrap",
    });

    const resumePrompt = this.deps.flowNodeContinuity.renderTemplate(
      "flow/continuity/resume.md",
      {
        nodeId,
        role,
        reportPath: reportPaths.reportPath,
        reportBody: await this.deps.reportState.loadContinuityResumeReportBody(
          reportPaths.reportPath
        ),
      }
    );
    await this.deps.messageDispatch.sendInternalMessage(
      nextSession.id,
      resumePrompt.trim()
    );
    this.emitNotification(
      nextSession.id,
      {
        ...notificationBase,
        phase: "resume_sent",
        continuityRequestId: requestId,
        continuityAttempt: finalAttempt,
        nextSessionId: nextSession.id,
        reportPath: reportPaths.reportPath,
      },
      options
    );
  }

  private emitNotification(
    sessionId: string,
    notification: Omit<FlowNodeRolloverNotification, "timestamp">,
    options?: { readonly silent: boolean }
  ): void {
    if (options?.silent) {
      return;
    }
    this.deps.reportState.emitFlowNodeRolloverNotification(
      sessionId,
      notification
    );
  }

  private toSafeTimestamp(value: string): string {
    return (
      value
        .trim()
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/-$/g, "") || "unknown"
    );
  }
}
