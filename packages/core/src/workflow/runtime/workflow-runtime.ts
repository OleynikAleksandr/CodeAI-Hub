import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProviderRegistry } from "../../provider-registry";
import type { SessionRequestHandler } from "../../remote-bridge/handlers/session-request-handler";
import type { Logger } from "../../telemetry/logger";
import { DescriptionStepStore } from "../description/description-step-store";
import type { DescriptionStepSnapshot } from "../description/description-step-types";
import { WorkflowLastActiveStore } from "../state/workflow-last-active-store";
import type { WorkflowWatcherEvent } from "../watcher/watcher-types";
import { WorkflowWatcher } from "../watcher/workflow-watcher";

const WORKSPACE_ROOT_DIR = ".codeai-hub";

const BACKSLASH_RE = /\\/g;
const LEADING_DOT_SLASH_RE = /^\.?\//;
const DESCRIPTION_DRAFT_RUN_SLUG_RE =
  /^description\/runs\/([^/]+)\/description\.md$/;

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

const parseDescriptionDraftRunSlug = (relativePath: string): string | null => {
  const match = DESCRIPTION_DRAFT_RUN_SLUG_RE.exec(relativePath);
  return match?.[1] ?? null;
};

const resolveCollectorAttemptId = (
  snapshot: DescriptionStepSnapshot | null
): string | null => {
  const ref =
    snapshot?.collectorSession ??
    (snapshot?.sessionKind === "collector" ? snapshot.session : undefined);
  return ref?.dialogSessionId ?? ref?.providerSessionId ?? null;
};

const shouldAcceptDescriptionDraftArtifact = (
  snapshot: DescriptionStepSnapshot | null,
  relativePath: string
): boolean => {
  const collectorAttemptId = resolveCollectorAttemptId(snapshot);
  const runSlug = parseDescriptionDraftRunSlug(relativePath);
  if (runSlug) {
    return !collectorAttemptId || runSlug === collectorAttemptId;
  }
  return !collectorAttemptId;
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

    if (event.stage !== "description") {
      return true;
    }

    const relativePath = normalizeRelativePath(event.filePath);
    if (
      relativePath === "description/description-step.json" ||
      relativePath.endsWith("/description-step.json")
    ) {
      return false;
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

    const isDraft =
      relativePath === "description/description.md" ||
      relativePath.endsWith("/description.md");
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
    if (!shouldAcceptDescriptionDraftArtifact(snapshot, relativePath)) {
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
