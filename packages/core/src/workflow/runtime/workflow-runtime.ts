import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProviderRegistry } from "../../provider-registry";
import type { SessionRequestHandler } from "../../remote-bridge/handlers/session-request-handler";
import type { Logger } from "../../telemetry/logger";
import { DescriptionStepStore } from "../description/description-step-store";
import { WorkflowLastActiveStore } from "../state/workflow-last-active-store";
import type {
  WorkflowStageId,
  WorkflowWatcherEvent,
} from "../watcher/watcher-types";
import { WorkflowWatcher } from "../watcher/workflow-watcher";

const WORKSPACE_ROOT_DIR = ".codeai-hub";

const BACKSLASH_RE = /\\/g;
const LEADING_DOT_SLASH_RE = /^\.?\//;

const normalizeRelativePath = (value: string): string =>
  value.replace(BACKSLASH_RE, "/").replace(LEADING_DOT_SLASH_RE, "");

const buildWorkflowRelativePath = (
  workspaceSlug: string,
  filePathWithinWorkspaceSlug: string
): string =>
  normalizeRelativePath(
    path.posix.join(
      WORKSPACE_ROOT_DIR,
      workspaceSlug,
      normalizeRelativePath(filePathWithinWorkspaceSlug)
    )
  );

const buildCanonicalStageArtifactPath = (
  workspaceSlug: string,
  stage: "virtual_simulation" | "diagram_modules"
): string => {
  if (stage === "virtual_simulation") {
    return buildWorkflowRelativePath(
      workspaceSlug,
      "virtual_simulation/virtual-simulation.md"
    );
  }
  if (stage === "diagram_modules") {
    return buildWorkflowRelativePath(
      workspaceSlug,
      "diagram_modules/product-parts.index.md"
    );
  }
  return buildWorkflowRelativePath(
    workspaceSlug,
    "diagram_modules/product-parts.index.md"
  );
};

const resolveLastActiveUpdateFromArtifact = (params: {
  readonly relativePath: string;
  readonly stage: WorkflowStageId;
  readonly workspaceSlug: string;
}): {
  readonly artifactPath: string;
  readonly stage: WorkflowStageId;
} | null => {
  if (
    params.stage === "virtual_simulation" &&
    params.relativePath === "virtual_simulation/virtual-simulation.md"
  ) {
    return {
      stage: "virtual_simulation",
      artifactPath: buildCanonicalStageArtifactPath(
        params.workspaceSlug,
        "virtual_simulation"
      ),
    };
  }

  if (
    params.stage === "diagram_modules" &&
    (params.relativePath === "diagram_modules/product-parts.index.md" ||
      params.relativePath.startsWith("diagram_modules/product-parts/"))
  ) {
    return {
      stage: "diagram_modules",
      artifactPath: buildCanonicalStageArtifactPath(
        params.workspaceSlug,
        "diagram_modules"
      ),
    };
  }

  return null;
};

export class WorkflowRuntime {
  private readonly logger: Logger;
  private readonly onWatcherEvent?: (event: WorkflowWatcherEvent) => void;
  private readonly descriptionStepStore = new DescriptionStepStore();
  private readonly lastActiveStore = new WorkflowLastActiveStore();
  private readonly watchers = new Map<string, WorkflowWatcher>();
  private readonly workspaces = new Map<string, string>();

  constructor(options: {
    readonly logger: Logger;
    readonly providerRegistry: ProviderRegistry;
    readonly sessionHandler: SessionRequestHandler;
    readonly onWatcherEvent?: (event: WorkflowWatcherEvent) => void;
  }) {
    this.logger = options.logger;
    this.onWatcherEvent = options.onWatcherEvent;
  }

  async connectWorkspace(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const key = params.workspaceSlug;
    const existingRoot = this.workspaces.get(key);
    if (
      existingRoot &&
      path.resolve(existingRoot) === path.resolve(params.workspaceRoot)
    ) {
      return;
    }

    this.workspaces.set(key, params.workspaceRoot);
    await fs.mkdir(
      path.join(params.workspaceRoot, WORKSPACE_ROOT_DIR, params.workspaceSlug),
      { recursive: true }
    );

    if (this.watchers.has(key)) {
      return;
    }

    const watchRoot = path.join(
      params.workspaceRoot,
      WORKSPACE_ROOT_DIR,
      params.workspaceSlug
    );

    const watcher = new WorkflowWatcher({
      logger: this.logger,
      workspaceSlug: params.workspaceSlug,
      watchRoot,
    });

    watcher.subscribe((event) => {
      this.handleWorkflowEvent(params.workspaceRoot, event)
        .then((shouldRecord) => {
          if (shouldRecord) {
            this.onWatcherEvent?.(event);
          }
        })
        .catch((error) => {
          this.logger.warn("Workflow runtime handler failed", {
            workspaceSlug: params.workspaceSlug,
            error: error instanceof Error ? error.message : String(error),
          });
          this.onWatcherEvent?.(event);
        });
    });

    watcher.start();
    this.watchers.set(key, watcher);
  }

  private async handleWorkflowEvent(
    workspaceRoot: string,
    event: WorkflowWatcherEvent
  ): Promise<boolean> {
    if (event.type !== "workflow.artifact.written") {
      return true;
    }

    const relativePath = normalizeRelativePath(event.filePath);
    if (event.stage !== "description") {
      const lastActiveUpdate = resolveLastActiveUpdateFromArtifact({
        relativePath,
        stage: event.stage,
        workspaceSlug: event.workspaceSlug,
      });
      if (!lastActiveUpdate) {
        return true;
      }

      await this.lastActiveStore.upsert(workspaceRoot, event.workspaceSlug, {
        stage: lastActiveUpdate.stage,
        artifactPath: lastActiveUpdate.artifactPath,
      });
      return true;
    }

    if (
      relativePath === "description/description-step.json" ||
      relativePath.endsWith("/description-step.json")
    ) {
      return true;
    }

    if (relativePath === "description/questionnaire.md") {
      await this.descriptionStepStore.upsert(
        workspaceRoot,
        event.workspaceSlug,
        {
          questionnairePath: buildWorkflowRelativePath(
            event.workspaceSlug,
            relativePath
          ),
        }
      );
      await this.lastActiveStore.upsert(workspaceRoot, event.workspaceSlug, {
        stage: "description",
        artifactPath: buildWorkflowRelativePath(
          event.workspaceSlug,
          relativePath
        ),
      });
      return true;
    }

    if (
      relativePath.endsWith("/Final_Description.md") ||
      relativePath === "description/Final_Description.md"
    ) {
      await this.descriptionStepStore.upsert(
        workspaceRoot,
        event.workspaceSlug,
        {
          finalPath: buildWorkflowRelativePath(
            event.workspaceSlug,
            relativePath
          ),
        }
      );
      await this.lastActiveStore.upsert(workspaceRoot, event.workspaceSlug, {
        stage: "description",
        artifactPath: buildWorkflowRelativePath(
          event.workspaceSlug,
          relativePath
        ),
      });
      return true;
    }

    if (relativePath.startsWith("description/runs/")) {
      return false;
    }

    const isDraft = relativePath === "description/description.md";
    if (!isDraft) {
      return true;
    }

    const snapshot = await this.descriptionStepStore.read(
      workspaceRoot,
      event.workspaceSlug
    );
    if (snapshot?.finalPath) {
      return false;
    }

    await this.descriptionStepStore.upsert(workspaceRoot, event.workspaceSlug, {
      draftPath: buildWorkflowRelativePath(event.workspaceSlug, relativePath),
    });
    await this.lastActiveStore.upsert(workspaceRoot, event.workspaceSlug, {
      stage: "description",
      artifactPath: buildWorkflowRelativePath(
        event.workspaceSlug,
        relativePath
      ),
    });

    return true;
  }
}
