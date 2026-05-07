import {
  ManagedPlanOrchestratorInstaller,
  type ManagedPlanOrchestratorInstallResult,
} from "./managed-plan-orchestrator-installer";
import {
  ManagedWorkspaceBootstrapper,
  type ManagedWorkspaceBootstrapResult,
} from "./managed-workspace-bootstrapper";
import {
  type ManagedWorkspaceValidationResult,
  ManagedWorkspaceValidator,
} from "./managed-workspace-validator";

export interface ManagedWorkspaceReconcileResult {
  readonly after: ManagedWorkspaceValidationResult;
  readonly before: ManagedWorkspaceValidationResult;
  readonly bootstrap: ManagedWorkspaceBootstrapResult;
  readonly installer: ManagedPlanOrchestratorInstallResult;
  readonly ok: boolean;
}

export interface ManagedWorkspaceReconcilerOptions {
  readonly bootstrapper?: ManagedWorkspaceBootstrapper;
  readonly installer?: ManagedPlanOrchestratorInstaller;
  readonly validator?: ManagedWorkspaceValidator;
}

export class ManagedWorkspaceReconciler {
  readonly #bootstrapper: ManagedWorkspaceBootstrapper;
  readonly #installer: ManagedPlanOrchestratorInstaller;
  readonly #validator: ManagedWorkspaceValidator;

  constructor(options: ManagedWorkspaceReconcilerOptions = {}) {
    this.#bootstrapper =
      options.bootstrapper ?? new ManagedWorkspaceBootstrapper();
    this.#installer =
      options.installer ?? new ManagedPlanOrchestratorInstaller();
    this.#validator = options.validator ?? new ManagedWorkspaceValidator();
  }

  async reconcile(
    workspaceRoot: string
  ): Promise<ManagedWorkspaceReconcileResult> {
    const before = await this.#validator.validate(workspaceRoot);
    const bootstrap = await this.#bootstrapper.bootstrap(workspaceRoot);
    const installer = await this.#installer.install(workspaceRoot);
    const after = await this.#validator.validate(workspaceRoot);

    return {
      after,
      before,
      bootstrap,
      installer,
      ok: after.ok,
    };
  }
}
