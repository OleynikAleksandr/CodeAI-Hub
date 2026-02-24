import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { ProviderRegistry } from "../../provider-registry";
import type { SessionRequestHandler } from "../../remote-bridge/handlers/session-request-handler";
import type { Logger } from "../../telemetry/logger";
import { DescriptionStepStore } from "../description/description-step-store";
import type { DescriptionStepSnapshot } from "../description/description-step-types";
import { WorkflowLastActiveStore } from "../state/workflow-last-active-store";
import type { WorkflowWatcherEvent } from "../watcher/watcher-types";
import { WorkflowWatcher } from "../watcher/workflow-watcher";

const REVIEWER_PROVIDER_PREFERENCE = ["claudeCodeCli", "codexCli"] as const;
const WORKSPACE_ROOT_DIR = ".codeai-hub";

const BACKSLASH_RE = /\\/g;
const LEADING_DOT_SLASH_RE = /^\.?\//;
const DESCRIPTION_DRAFT_RUN_SLUG_RE =
  /^description\/runs\/([^/]+)\/description\.md$/;

const normalizeRelativePath = (value: string): string =>
  value.replace(BACKSLASH_RE, "/").replace(LEADING_DOT_SLASH_RE, "");

const joinWorkspacePath = (
  workspaceRoot: string,
  relativePath: string
): string => path.resolve(workspaceRoot, relativePath);

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

const resolvePreferredReviewerProviderId = (
  providerRegistry: ProviderRegistry,
  preferredProviderId: string | null
): string | null => {
  if (preferredProviderId) {
    const adapter = providerRegistry.getAdapter(preferredProviderId);
    if (adapter?.resumeSession) {
      return preferredProviderId;
    }
  }

  for (const providerId of REVIEWER_PROVIDER_PREFERENCE) {
    const adapter = providerRegistry.getAdapter(providerId);
    if (adapter?.resumeSession) {
      return providerId;
    }
  }

  return null;
};

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

const resolveReviewerPromptPath = (): string | null => {
  const home = homedir();
  if (!home) {
    return null;
  }
  return path.join(
    home,
    WORKSPACE_ROOT_DIR,
    "templates",
    "description",
    "reviewer-prompt.md"
  );
};

const resolveReviewerTemplatePath = (): string | null => {
  const home = homedir();
  if (!home) {
    return null;
  }
  return path.join(
    home,
    WORKSPACE_ROOT_DIR,
    "templates",
    "description",
    "reviewer-template.md"
  );
};

const readReviewerPrompt = async (): Promise<string> => {
  const promptPath = resolveReviewerPromptPath();
  if (!promptPath) {
    return "Ты — Reviewer Agent. Преобразуй draft description.md в Final_Description.md. Общайся с пользователем только на русском и формируй артефакт только на русском языке.";
  }
  try {
    return await fs.readFile(promptPath, "utf8");
  } catch {
    return "Ты — Reviewer Agent. Преобразуй draft description.md в Final_Description.md. Общайся с пользователем только на русском и формируй артефакт только на русском языке.";
  }
};

const buildReviewerPromptPack = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly draftRelativePath: string;
  readonly questionnaireRelativePath: string;
}): Promise<string> => {
  const prompt = (await readReviewerPrompt()).trim();
  const finalRelativePath = `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`;

  const instructionLines = [
    "Этап: Description Reviewer.",
    `Draft (relative): \`${params.draftRelativePath}\``,
    `Draft (absolute): \`${joinWorkspacePath(params.workspaceRoot, params.draftRelativePath)}\``,
    `Final target (relative): \`${finalRelativePath}\``,
    `Final target (absolute): \`${joinWorkspacePath(params.workspaceRoot, finalRelativePath)}\``,
    `Questionnaire (relative): \`${params.questionnaireRelativePath}\``,
    `Questionnaire (absolute): \`${joinWorkspacePath(params.workspaceRoot, params.questionnaireRelativePath)}\``,
  ];

  const reviewerTemplatePath = resolveReviewerTemplatePath();
  if (reviewerTemplatePath) {
    try {
      await fs.access(reviewerTemplatePath);
      instructionLines.push(
        `Reviewer template (absolute): \`${reviewerTemplatePath}\``
      );
    } catch {
      // Template is optional; omit if missing.
    }
  }

  return [prompt, instructionLines.join("\n")].join("\n\n");
};

export class WorkflowRuntime {
  private readonly logger: Logger;
  private readonly providerRegistry: ProviderRegistry;
  private readonly sessionHandler: SessionRequestHandler;
  private readonly onWatcherEvent?: (event: WorkflowWatcherEvent) => void;
  private readonly descriptionStepStore = new DescriptionStepStore();
  private readonly lastActiveStore = new WorkflowLastActiveStore();
  private readonly watchers = new Map<string, WorkflowWatcher>();
  private readonly startingReviewer = new Set<string>();
  private readonly workspaces = new Map<string, string>();

  constructor(options: {
    readonly logger: Logger;
    readonly providerRegistry: ProviderRegistry;
    readonly sessionHandler: SessionRequestHandler;
    readonly onWatcherEvent?: (event: WorkflowWatcherEvent) => void;
  }) {
    this.logger = options.logger;
    this.providerRegistry = options.providerRegistry;
    this.sessionHandler = options.sessionHandler;
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

    await this.maybeAutoStartReviewer({
      workspaceRoot,
      workspaceSlug: event.workspaceSlug,
    });

    return true;
  }

  private async maybeAutoStartReviewer(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    if (this.startingReviewer.has(params.workspaceSlug)) {
      return;
    }

    const snapshot = await this.descriptionStepStore.read(
      params.workspaceRoot,
      params.workspaceSlug
    );

    if (!snapshot?.draftPath || snapshot.finalPath) {
      return;
    }
    if (snapshot.sessionKind === "reviewer") {
      return;
    }

    const preferredProviderId = snapshot.session?.providerId ?? null;
    const providerId = resolvePreferredReviewerProviderId(
      this.providerRegistry,
      preferredProviderId
    );
    if (
      preferredProviderId &&
      providerId &&
      providerId !== preferredProviderId
    ) {
      this.logger.warn(
        "Reviewer auto-start switched provider due resume support",
        {
          workspaceSlug: params.workspaceSlug,
          preferredProviderId,
          selectedProviderId: providerId,
        }
      );
    }
    if (!providerId) {
      this.logger.warn("Reviewer auto-start skipped: no resumable provider", {
        workspaceSlug: params.workspaceSlug,
        preferredProviderId,
      });
      return;
    }

    this.startingReviewer.add(params.workspaceSlug);
    try {
      const session = await this.sessionHandler.createSessionForWorkflow({
        providerId,
        workspacePath: params.workspaceRoot,
        context: {
          initiativeSlug: params.workspaceSlug,
          stage: "description",
          runSlug: "reviewer",
          resumeMode: "resume_in_place",
        },
      });

      if (!session) {
        this.logger.warn("Reviewer auto-start failed: session not created", {
          workspaceSlug: params.workspaceSlug,
          providerId,
        });
        return;
      }

      const promptPack = await buildReviewerPromptPack({
        ...params,
        draftRelativePath: snapshot.draftPath,
        questionnaireRelativePath:
          snapshot.questionnairePath ??
          `.codeai-hub/${params.workspaceSlug}/description/questionnaire.md`,
      });
      await this.sessionHandler.handleMessage(session.id, promptPack);
    } finally {
      this.startingReviewer.delete(params.workspaceSlug);
    }
  }
}
