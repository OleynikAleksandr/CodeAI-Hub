import { readFile } from "node:fs/promises";
import path from "node:path";
import { ManagedWorkflowOrchestrationFacade } from "../../managed-workflow-orchestration";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { ProviderRegistry } from "../../provider-registry";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Session, SessionManager } from "../../session-manager";
import type { SessionModelBinding } from "../../session-model-binding";
import type { Logger } from "../../telemetry/logger";
import { WorkflowBoundaryFacade } from "../../workflow/boundary/workflow-boundary-facade";
import { isWorkflowBoundaryStage } from "../../workflow/boundary/workflow-boundary-model";
import { type BridgeEvent, serializeSession } from "../types";
import type { MessageContentPayload } from "./session-request-handler-event-messages";
import type { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";

const defaultManagedWorkflowOrchestration =
  new ManagedWorkflowOrchestrationFacade();
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const APPLICATION_SKELETON_BOOTSTRAP_TASK_ID =
  "application-skeleton.phase1.bootstrap.task1";
const APPLICATION_SKELETON_STAGE_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
const DIAGRAM_MODULES_STAGE = "diagram_modules";
const QUALITY_GATES_STAGE = "quality_gates";
const QUALITY_GATES_BOOTSTRAP_TASK_ID = "quality-gates.phase1.bootstrap.task1";
const QUALITY_GATES_STAGE_PLAN_PATH =
  "doc/TODO/stages/quality-gates/todo-plan.md";
const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const PLAN_START = "<!-- codeai-plan-state:start -->";
const PLAN_END = "<!-- codeai-plan-state:end -->";

interface SessionRequestHandlerSessionResolutionDependencies {
  readonly applicationSkeletonStagePlan?: ApplicationSkeletonStagePlanController;
  readonly broadcaster: (event: BridgeEvent) => void;
  readonly broadcastSessionBinding: (sessionId: string) => void;
  readonly getDefaultProviderId: () => string;
  readonly handleMessage: (
    sessionId: string,
    payload: MessageContentPayload
  ) => Promise<void>;
  readonly handleProviderFailure: (
    providerId: string,
    error: unknown,
    sessionId?: string
  ) => void;
  readonly logger: Logger;
  readonly managedWorkflowOrchestration?: ManagedWorkflowOrchestrationFacade;
  readonly providerRegistry: ProviderRegistry;
  readonly qualityGatesStagePlan?: QualityGatesStagePlanController;
  readonly scaffoldInstaller?: ManagedWorkflowScaffoldInstaller;
  readonly sessionBootstrap: SessionRequestHandlerSessionBootstrap;
  readonly sessionManager: SessionManager;
  readonly workflowBoundaryFacade?: Pick<
    WorkflowBoundaryFacade,
    "ensureBoundary"
  >;
  readonly workspacePathOverride?: string;
}

export class SessionRequestHandlerSessionResolution {
  private readonly deps: SessionRequestHandlerSessionResolutionDependencies;
  private readonly applicationSkeletonStagePlan: ApplicationSkeletonStagePlanController;
  private readonly managedWorkflowOrchestration: ManagedWorkflowOrchestrationFacade;
  private readonly qualityGatesStagePlan: QualityGatesStagePlanController;
  private readonly scaffoldInstaller: ManagedWorkflowScaffoldInstaller;

  constructor(deps: SessionRequestHandlerSessionResolutionDependencies) {
    this.deps = deps;
    this.applicationSkeletonStagePlan =
      deps.applicationSkeletonStagePlan ??
      new ApplicationSkeletonStagePlanController();
    this.managedWorkflowOrchestration =
      deps.managedWorkflowOrchestration ?? defaultManagedWorkflowOrchestration;
    this.qualityGatesStagePlan =
      deps.qualityGatesStagePlan ?? new QualityGatesStagePlanController();
    this.scaffoldInstaller =
      deps.scaffoldInstaller ?? new ManagedWorkflowScaffoldInstaller();
  }

  async createContinuitySession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
    };
    readonly rootSessionId: string;
  }): Promise<Session | null> {
    const adapter = this.deps.providerRegistry.getAdapter(options.providerId);
    if (!adapter) {
      this.deps.logger.warn(
        "Continuity session creation failed: provider missing",
        {
          providerId: options.providerId,
        }
      );
      return null;
    }
    try {
      return await this.deps.sessionBootstrap.createAndRegisterSession({
        providerId: options.providerId,
        workspacePath: options.workspacePath,
        adapter,
        context: {
          initiativeSlug: options.context.initiativeSlug,
          stage: options.context.stage,
          runSlug: null,
          providerSessionId: null,
        },
        rootSessionId: options.rootSessionId,
      });
    } catch (error) {
      this.deps.handleProviderFailure(options.providerId, error);
      return null;
    }
  }

  async handleCreate(
    providerId?: string,
    workspacePath?: string,
    context?: {
      readonly initiativeSlug?: string | null;
      readonly stage?: string | null;
      readonly runSlug?: string | null;
      readonly providerSessionId?: string | null;
      readonly targetModelId?: string | null;
    }
  ): Promise<void> {
    const requestedProviderId =
      this.normalizeProviderId(providerId) ?? this.deps.getDefaultProviderId();
    const actualWorkspacePath = this.resolveWorkspacePath(workspacePath);
    const runBound = this.deps.sessionBootstrap.resolveRunBoundProviderContext({
      providerId: requestedProviderId,
      workspacePath: actualWorkspacePath,
      initiativeSlug: context?.initiativeSlug ?? null,
      runSlug: context?.runSlug ?? null,
      requestedProviderSessionId: context?.providerSessionId ?? null,
    });
    try {
      await this.prepareManagedWorkflowStart({
        context: {
          initiativeSlug: context?.initiativeSlug ?? null,
          runSlug: context?.runSlug ?? null,
          stage: context?.stage ?? null,
        },
        providerId: runBound.providerId,
        workspacePath: actualWorkspacePath,
      });
    } catch (error) {
      this.deps.handleProviderFailure(runBound.providerId, error);
      return;
    }
    if (
      this.tryReuseExistingResumeSession({
        providerId: runBound.providerId,
        workspacePath: actualWorkspacePath,
        providerSessionId: runBound.providerSessionId,
        context: {
          initiativeSlug: context?.initiativeSlug ?? null,
          stage: context?.stage ?? null,
          runSlug: context?.runSlug ?? null,
        },
      })
    ) {
      return;
    }
    const adapter = this.deps.providerRegistry.getAdapter(runBound.providerId);
    if (!adapter) {
      this.deps.broadcaster({
        type: "session:error",
        payload: { message: `Provider ${runBound.providerId} unavailable` },
      });
      return;
    }
    try {
      await this.deps.sessionBootstrap.createAndRegisterSession({
        providerId: runBound.providerId,
        workspacePath: actualWorkspacePath,
        adapter,
        context: {
          initiativeSlug: context?.initiativeSlug ?? null,
          stage: context?.stage ?? null,
          runSlug: context?.runSlug ?? null,
          providerSessionId: runBound.providerSessionId,
        },
        targetModelId: context?.targetModelId ?? null,
      });
    } catch (error) {
      this.deps.handleProviderFailure(runBound.providerId, error);
    }
  }

  async handleDialogSend(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
    readonly content: string;
    readonly turnOptions?: Record<string, unknown>;
  }): Promise<
    { readonly ok: true } | { readonly ok: false; readonly error: string }
  > {
    const chains = await SessionContinuityFacade.readWorkspaceChains({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    });
    const chain = chains.find(
      (candidate) =>
        (candidate.dialogId ?? candidate.rootSessionId) === options.dialogId
    );
    if (!chain) {
      return { ok: false, error: "Dialog chain not found" };
    }
    const last = chain.segments.at(-1) ?? null;
    if (!last) {
      return { ok: false, error: "Dialog has no segments" };
    }
    const adapter = this.deps.providerRegistry.getAdapter(last.providerId);
    if (!adapter) {
      return { ok: false, error: `Provider ${last.providerId} unavailable` };
    }
    const existingSession = this.deps.sessionManager
      .getSessionsByWorkspacePath(options.workspaceRoot)
      .find(
        (candidate) =>
          candidate.providerId === last.providerId &&
          candidate.providerSessionId === last.providerSessionId
      );
    const context = {
      initiativeSlug: options.workspaceSlug,
      stage: chain.stage === "unknown" ? null : chain.stage,
      runSlug: this.inferRunSlugFromDialogId(options.dialogId),
    };
    const hydratedExistingSession = existingSession
      ? this.deps.sessionManager.hydrateSessionContext(
          existingSession.id,
          context
        )
      : null;
    if (
      hydratedExistingSession &&
      last.modelBinding &&
      this.shouldApplyContinuityModelBinding(
        hydratedExistingSession,
        last.modelBinding
      )
    ) {
      this.deps.sessionManager.setModelBinding(
        hydratedExistingSession.id,
        last.modelBinding
      );
    }
    const resolvedSession =
      hydratedExistingSession ??
      (await this.deps.sessionBootstrap.createAndRegisterSession({
        providerId: last.providerId,
        workspacePath: options.workspaceRoot,
        adapter,
        context: {
          ...context,
          providerSessionId: last.providerSessionId,
        },
        inheritedModelBinding: last.modelBinding ?? null,
        rootSessionId: options.dialogId,
      }));
    if (!resolvedSession) {
      return { ok: false, error: "Failed to resume dialog session" };
    }
    await this.deps.handleMessage(
      resolvedSession.id,
      options.turnOptions
        ? { content: options.content, turnOptions: options.turnOptions }
        : options.content
    );
    return { ok: true };
  }

  private normalizeProviderId(value?: string): string | null {
    return this.normalizeNullableToken(value);
  }

  private shouldApplyContinuityModelBinding(
    session: Session,
    snapshot: SessionModelBinding
  ): boolean {
    const current = session.modelBinding ?? null;
    if (!current) {
      return true;
    }
    const currentTime = this.parseBindingTime(current);
    const snapshotTime = this.parseBindingTime(snapshot);
    return snapshotTime !== null && currentTime !== null
      ? snapshotTime > currentTime
      : false;
  }

  private parseBindingTime(binding: SessionModelBinding): number | null {
    const value = binding.updatedAt || binding.boundAt;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  private resolveWorkspacePath(workspacePath?: string): string {
    const trimmed = this.normalizeNullableToken(workspacePath);
    const cwdPath = process.cwd();
    const override = this.deps.workspacePathOverride;
    if (
      override &&
      (!trimmed || path.resolve(trimmed) === path.resolve(cwdPath))
    ) {
      return override;
    }
    return trimmed ?? override ?? cwdPath;
  }

  private normalizeNullableToken(
    value: string | null | undefined
  ): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async prepareManagedWorkflowStart(options: {
    readonly context: {
      readonly initiativeSlug?: string | null;
      readonly runSlug?: string | null;
      readonly stage?: string | null;
    };
    readonly providerId: string;
    readonly workspacePath: string;
  }): Promise<void> {
    const stageId = this.normalizeNullableToken(options.context.stage);
    const workspaceSlug = this.normalizeNullableToken(
      options.context.initiativeSlug
    );
    if (!(stageId && workspaceSlug)) {
      return;
    }
    const managedDecision = this.managedWorkflowOrchestration.resolveStageStart(
      {
        providerId: options.providerId,
        runSlug: this.normalizeNullableToken(options.context.runSlug),
        stageId,
        workspaceRoot: options.workspacePath,
        workspaceSlug,
      }
    );
    if (managedDecision?.mode !== "managed_dispatch") {
      return;
    }
    if (isWorkflowBoundaryStage(stageId)) {
      await (
        this.deps.workflowBoundaryFacade ?? new WorkflowBoundaryFacade()
      ).ensureBoundary({
        stage: stageId,
        workspaceRoot: options.workspacePath,
        workspaceSlug,
      });
    }
    await this.scaffoldInstaller.installDiagramModulesScaffold({
      workspaceRoot: options.workspacePath,
    });
    if (stageId === DIAGRAM_MODULES_STAGE) {
      await this.scaffoldInstaller.checkpointDiagramModulesInputs({
        workspaceRoot: options.workspacePath,
        workspaceSlug,
      });
    }
    if (
      stageId === APPLICATION_SKELETON_STAGE &&
      (await this.shouldOpenApplicationSkeletonDraft(options.workspacePath))
    ) {
      await this.applicationSkeletonStagePlan.openDraftPhase({
        workspaceRoot: options.workspacePath,
      });
    }
    if (
      stageId === QUALITY_GATES_STAGE &&
      (await this.shouldOpenQualityGatesDraft(options.workspacePath))
    ) {
      await this.qualityGatesStagePlan.openDraftPhase({
        workspaceRoot: options.workspacePath,
      });
    }
  }

  private async shouldOpenApplicationSkeletonDraft(
    workspaceRoot: string
  ): Promise<boolean> {
    const planText = await readFile(
      path.join(workspaceRoot, APPLICATION_SKELETON_STAGE_PLAN_PATH),
      "utf8"
    ).catch(() => null);
    if (!planText) {
      return true;
    }
    const rawState = planText.split(PLAN_START)[1]?.split(PLAN_END)[0];
    const json = rawState
      ?.trim()
      .replace(FENCED_JSON_START_RE, "")
      .replace(FENCED_JSON_END_RE, "")
      .trim();
    if (!json) {
      return true;
    }
    const state = JSON.parse(json) as { readonly currentTaskId?: unknown };
    return (
      state.currentTaskId === null ||
      state.currentTaskId === APPLICATION_SKELETON_BOOTSTRAP_TASK_ID
    );
  }

  private async shouldOpenQualityGatesDraft(
    workspaceRoot: string
  ): Promise<boolean> {
    const planText = await readFile(
      path.join(workspaceRoot, QUALITY_GATES_STAGE_PLAN_PATH),
      "utf8"
    ).catch(() => null);
    if (!planText) {
      return true;
    }
    const rawState = planText.split(PLAN_START)[1]?.split(PLAN_END)[0];
    const json = rawState
      ?.trim()
      .replace(FENCED_JSON_START_RE, "")
      .replace(FENCED_JSON_END_RE, "")
      .trim();
    if (!json) {
      return true;
    }
    const state = JSON.parse(json) as { readonly currentTaskId?: unknown };
    return (
      state.currentTaskId === null ||
      state.currentTaskId === QUALITY_GATES_BOOTSTRAP_TASK_ID
    );
  }

  private tryReuseExistingResumeSession(options: {
    readonly providerId: string;
    readonly workspacePath: string;
    readonly providerSessionId: string | null;
    readonly context?: {
      readonly initiativeSlug?: string | null;
      readonly stage?: string | null;
      readonly runSlug?: string | null;
    };
  }): boolean {
    const providerSessionId = this.normalizeNullableToken(
      options.providerSessionId
    );
    if (!providerSessionId) {
      return false;
    }
    for (const session of this.deps.sessionManager.listSessions()) {
      if (
        session.providerId === options.providerId &&
        session.workspacePath === options.workspacePath &&
        session.providerSessionId === providerSessionId &&
        (this.normalizeNullableToken(options.context?.stage) === null ||
          session.stage ===
            this.normalizeNullableToken(options.context?.stage)) &&
        (this.normalizeNullableToken(options.context?.runSlug) === null ||
          session.runSlug ===
            this.normalizeNullableToken(options.context?.runSlug)) &&
        (this.normalizeNullableToken(options.context?.initiativeSlug) ===
          null ||
          session.initiativeSlug ===
            this.normalizeNullableToken(options.context?.initiativeSlug))
      ) {
        this.deps.broadcaster({
          type: "session:created",
          payload: serializeSession(session),
        });
        this.deps.broadcastSessionBinding(session.id);
        return true;
      }
    }
    return false;
  }

  private inferRunSlugFromDialogId(dialogId: string): string | null {
    const trimmed = dialogId.trim().toLowerCase();
    return trimmed.endsWith("__collector") || trimmed.endsWith("-collector")
      ? "collector"
      : null;
  }
}
