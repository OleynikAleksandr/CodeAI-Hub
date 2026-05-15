import { validateDiagramModulesManagedArtifacts } from "./diagram-modules/diagram-modules-validator";
import type {
  ManagedWorkflowOrchestrationFacadeContract,
  ManagedWorkflowPreviewBoundaryStartDecision,
  ManagedWorkflowProviderTurnValidationDecision,
  ManagedWorkflowProviderTurnValidationRequest,
  ManagedWorkflowStageDescriptor,
  ManagedWorkflowStageId,
  ManagedWorkflowStageStartDecision,
  ManagedWorkflowStageStartRequest,
} from "./managed-workflow-orchestration-contracts";
import { ManagedWorkflowStateMachine } from "./managed-workflow-state-machine";
import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

const DEFAULT_STAGE_START_POLICY = "core_preview_boundary";

const describeControllerStage = (controller: {
  readonly descriptor: ManagedWorkflowStageDescriptor;
}): ManagedWorkflowStageDescriptor => ({
  ...controller.descriptor,
  startPolicy: controller.descriptor.startPolicy ?? DEFAULT_STAGE_START_POLICY,
});

export class ManagedWorkflowOrchestrationFacade
  implements ManagedWorkflowOrchestrationFacadeContract
{
  readonly #registry: ManagedWorkflowStepRegistry;
  readonly #stateMachine = new ManagedWorkflowStateMachine();

  constructor(options?: { readonly registry?: ManagedWorkflowStepRegistry }) {
    this.#registry = options?.registry ?? new ManagedWorkflowStepRegistry();
  }

  canHandleStage(stageId: string): stageId is ManagedWorkflowStageId {
    return this.#registry.has(stageId);
  }

  describeStage(stageId: string): ManagedWorkflowStageDescriptor | null {
    const controller = this.#registry.get(stageId);
    return controller ? describeControllerStage(controller) : null;
  }

  listRegisteredStages(): readonly ManagedWorkflowStageDescriptor[] {
    return this.#registry.list().map(describeControllerStage);
  }

  resolveStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowStageStartDecision | null {
    const controller = this.#registry.get(request.stageId);
    if (!controller) {
      return null;
    }
    const stage = describeControllerStage(controller);
    if (stage.startPolicy === "provider_direct") {
      return {
        canDispatchProvider: true,
        code: "managed_workflow_provider_direct",
        controllerId: stage.stageId,
        message: "",
        mode: "provider_direct",
        stage,
      };
    }
    if (stage.startPolicy === "managed_dispatch") {
      return {
        canDispatchProvider: true,
        code: "managed_workflow_managed_dispatch",
        controllerId: stage.stageId,
        message: [
          "Managed Workflow Orchestration cluster will dispatch this stage.",
          "Core owns the managed phase lifecycle for this step.",
        ].join("\n"),
        mode: "managed_dispatch",
        stage,
      };
    }
    const preview = controller.createPreviewBoundary(request);

    return {
      canDispatchProvider: false,
      code: preview.code,
      controllerId: stage.stageId,
      message: [
        "Managed Workflow Orchestration cluster preview boundary.",
        preview.message,
      ].join("\n"),
      mode: "preview",
      stage,
    };
  }

  previewStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowPreviewBoundaryStartDecision | null {
    const decision = this.resolveStageStart(request);
    return decision?.code === "managed_workflow_preview_boundary"
      ? decision
      : null;
  }

  async validateProviderTurn(
    request: ManagedWorkflowProviderTurnValidationRequest
  ): Promise<ManagedWorkflowProviderTurnValidationDecision | null> {
    if (request.stageId !== "diagram_modules") {
      return null;
    }
    const validation = await validateDiagramModulesManagedArtifacts(request);
    const providerCompleted = this.#stateMachine.reduce(
      this.#stateMachine.createInitialSnapshot({
        stageId: "diagram_modules",
        updatedAt: request.occurredAt,
        workspaceRoot: request.workspaceRoot,
        workspaceSlug: request.workspaceSlug,
      }),
      {
        eventId: `${request.sessionId}:provider-turn-completed`,
        kind: "provider_turn_completed",
        occurredAt: request.occurredAt,
        providerId: request.providerId,
        sessionId: request.sessionId,
        stageId: "diagram_modules",
        workspaceRoot: request.workspaceRoot,
        workspaceSlug: request.workspaceSlug,
      }
    );
    const transition = this.#stateMachine.reduce(providerCompleted.snapshot, {
      eventId: `${request.sessionId}:core-validation-completed`,
      kind: "core_validation_completed",
      occurredAt: request.occurredAt,
      reasons: validation.diagnostics,
      result: validation.valid ? "accepted" : "rejected",
      stageId: "diagram_modules",
      workspaceRoot: request.workspaceRoot,
      workspaceSlug: request.workspaceSlug,
    });
    return {
      accepted: validation.valid,
      effects: transition.effects,
      reasons: validation.diagnostics,
      snapshot: transition.snapshot,
    };
  }
}
