import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Express, Request, Response } from "express";
import type { FileDropService } from "../../file-drop/file-drop-service";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import {
  buildDescriptionContract,
  buildDiagramFacadesContract,
  buildDiagramModulesContract,
  buildIdeaContract,
  buildVirtualSimulationContract,
} from "./idea-contract-service";
import { InitiativesHttpHandler } from "./initiatives-http-handler";
import type { SessionRequestHandler } from "./session-request-handler";
import type {
  StatusInfo,
  SystemRequestHandler,
} from "./system-request-handler";
import { handleWorkflowArtifactRead } from "./workflow-artifact-http-handler";
import type { WorkflowEventsService } from "./workflow-events-service";
import type { WorkflowStateService } from "./workflow-state-service";
import { handleWorkspaceActivate } from "./workspace-activate-service";
import {
  handleWorkspaceFileRead,
  handleWorkspaceFileWrite,
} from "./workspace-file-service";
import { handleWorkspaceSessionCreate } from "./workspace-session-service";

const HTTP_INTERNAL_ERROR = 500;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const HTTP_NO_CONTENT = 204;
const IDEA_CONTRACT_ENDPOINT = "/api/v1/orchestrator/idea-contract";
const DESCRIPTION_CONTRACT_ENDPOINT =
  "/api/v1/orchestrator/description-contract";
const VIRTUAL_SIMULATION_CONTRACT_ENDPOINT =
  "/api/v1/orchestrator/virtual-simulation-contract";
const DIAGRAM_MODULES_CONTRACT_ENDPOINT =
  "/api/v1/orchestrator/diagram-modules-contract";
const DIAGRAM_FACADES_CONTRACT_ENDPOINT =
  "/api/v1/orchestrator/diagram-facades-contract";
const IDEA_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/idea-artifact";
const ARTIFACT_UPSERT_ENDPOINT = "/api/v1/orchestrator/artifact-upsert";
const INITIATIVES_ENDPOINT = "/api/v1/orchestrator/initiatives";
const WORKSPACE_FILE_ENDPOINT = "/api/v1/orchestrator/workspace-file";
const WORKSPACE_FILE_WRITE_ENDPOINT =
  "/api/v1/orchestrator/workspace-file-write";
const WORKSPACE_SESSION_ENDPOINT = "/api/v1/orchestrator/workspace-session";
const WORKSPACE_ACTIVATE_ENDPOINT = "/api/v1/orchestrator/workspace-activate";
const WORKFLOW_STATE_ENDPOINT = "/api/v1/orchestrator/workflow-state";
const WORKFLOW_EVENTS_ENDPOINT = "/api/v1/orchestrator/workflow-events";
const WORKFLOW_ARTIFACT_ENDPOINT = "/api/v1/orchestrator/workflow-artifact";
const DESCRIPTION_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/description\/Final_Description\.md$/;
const VIRTUAL_SIMULATION_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/virtual_simulation\/(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?virtual-simulation\.md$/;
const DIAGRAM_MODULES_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/diagram_modules\/(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?modules-diagram\.mmd$/;
const DIAGRAM_FACADES_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/diagram_facades\/(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?facades-graph\.mmd$/;
const LEGACY_IDEA_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/description\/runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/idea\/idea\.md$/;
const LEGACY_VIRTUAL_SIMULATION_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/description\/runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/idea\/virtual-simulation\.md$/;

export type RouterDependencies = {
  readonly app: Express;
  readonly systemHandler: SystemRequestHandler;
  readonly fileDropService: FileDropService;
  readonly sessionHandler: SessionRequestHandler;
  readonly sessionManager: SessionManager;
  readonly sessionStorage: UnifiedSessionStorage;
  readonly logger: Logger;
  readonly workflowEventsService: WorkflowEventsService;
  readonly workflowStateService: WorkflowStateService;
  readonly onWorkspaceSessionCreated?: (
    workspacePath: string,
    workspaceSlug: string
  ) => Promise<void> | void;
  readonly getStatusInfo: () => StatusInfo;
};

export class HttpApiRouter {
  private readonly deps: RouterDependencies;

  constructor(deps: RouterDependencies) {
    this.deps = deps;
  }

  registerRoutes(): void {
    const { app, systemHandler, fileDropService } = this.deps;
    const initiativesHandler = new InitiativesHttpHandler(this.deps.logger);
    const workflowStateService = this.deps.workflowStateService;
    const workflowEventsService = this.deps.workflowEventsService;

    app.get("/api/v1/health", (req: Request, res: Response) => {
      systemHandler.handleHealth(
        req,
        res,
        this.deps.getStatusInfo().clientCount
      );
    });

    app.get("/api/v1/status", (req: Request, res: Response) => {
      systemHandler.handleStatus(req, res, this.deps.getStatusInfo());
    });

    app.post("/api/v1/shutdown", (req: Request, res: Response) => {
      systemHandler.handleShutdown(req, res);
    });

    app.get(
      "/api/v1/sessions/:sessionId/history",
      async (req: Request, res: Response) => {
        await this.handleSessionHistory(req, res);
      }
    );

    app.post("/api/v1/file-drop", async (_req: Request, res: Response) => {
      await this.handleFileDropCollect(res);
    });

    app.delete("/api/v1/file-drop", (_req: Request, res: Response) => {
      fileDropService.clear();
      res.status(HTTP_NO_CONTENT).end();
    });

    app.get(IDEA_CONTRACT_ENDPOINT, async (_req: Request, res: Response) => {
      await this.handleIdeaContract(res);
    });

    app.get(
      DESCRIPTION_CONTRACT_ENDPOINT,
      async (_req: Request, res: Response) => {
        await this.handleWorkflowContract(
          res,
          buildDescriptionContract,
          "Description"
        );
      }
    );

    app.get(
      VIRTUAL_SIMULATION_CONTRACT_ENDPOINT,
      async (_req: Request, res: Response) => {
        await this.handleWorkflowContract(
          res,
          buildVirtualSimulationContract,
          "Virtual simulation"
        );
      }
    );

    app.get(
      DIAGRAM_MODULES_CONTRACT_ENDPOINT,
      async (_req: Request, res: Response) => {
        await this.handleWorkflowContract(
          res,
          buildDiagramModulesContract,
          "Diagram modules"
        );
      }
    );

    app.get(
      DIAGRAM_FACADES_CONTRACT_ENDPOINT,
      async (_req: Request, res: Response) => {
        await this.handleWorkflowContract(
          res,
          buildDiagramFacadesContract,
          "Diagram facades"
        );
      }
    );

    app.post(IDEA_ARTIFACT_ENDPOINT, async (req: Request, res: Response) => {
      await this.handleIdeaArtifactSave(req, res);
    });

    app.post(ARTIFACT_UPSERT_ENDPOINT, async (req: Request, res: Response) => {
      await this.handleArtifactUpsertSave(req, res);
    });

    app.post(
      WORKSPACE_SESSION_ENDPOINT,
      async (req: Request, res: Response) => {
        await handleWorkspaceSessionCreate({
          req,
          res,
          sessionManager: this.deps.sessionManager,
          logger: this.deps.logger,
          onWorkspaceSessionCreated: this.deps.onWorkspaceSessionCreated,
        });
      }
    );

    app.post(
      WORKSPACE_ACTIVATE_ENDPOINT,
      async (req: Request, res: Response) => {
        await handleWorkspaceActivate({
          req,
          res,
          logger: this.deps.logger,
          onWorkspaceActivated: this.deps.onWorkspaceSessionCreated,
          sessionHandler: this.deps.sessionHandler,
        });
      }
    );

    app.get(INITIATIVES_ENDPOINT, async (req: Request, res: Response) => {
      await initiativesHandler.handleList(req, res);
    });

    app.post(INITIATIVES_ENDPOINT, async (req: Request, res: Response) => {
      await initiativesHandler.handleCreate(req, res);
    });

    app.post(WORKSPACE_FILE_ENDPOINT, async (req: Request, res: Response) => {
      await handleWorkspaceFileRead(
        req,
        res,
        this.deps.sessionManager,
        this.deps.logger
      );
    });

    app.post(
      WORKSPACE_FILE_WRITE_ENDPOINT,
      async (req: Request, res: Response) => {
        await handleWorkspaceFileWrite(
          req,
          res,
          this.deps.sessionManager,
          this.deps.logger
        );
      }
    );

    app.get(WORKFLOW_STATE_ENDPOINT, (req: Request, res: Response) => {
      workflowStateService.handleWorkflowStateRead(req, res);
    });

    app.get(WORKFLOW_EVENTS_ENDPOINT, (req: Request, res: Response) => {
      workflowEventsService.handleWorkflowEventsRead(req, res);
    });

    app.get(WORKFLOW_ARTIFACT_ENDPOINT, async (req: Request, res: Response) => {
      await handleWorkflowArtifactRead(req, res);
    });
  }

  private async handleSessionHistory(
    req: Request,
    res: Response
  ): Promise<void> {
    const sessionId = req.params.sessionId;
    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      res.status(HTTP_NOT_FOUND).json({
        error: `Session ${sessionId} not found`,
      });
      return;
    }
    try {
      const messages = await this.deps.sessionStorage.readMessages(session);
      res.json({
        sessionId: session.id,
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          sessionId: message.sessionId,
        })),
      });
    } catch (error) {
      this.deps.logger.error("Failed to read session history", error as Error, {
        sessionId: session.id,
      });
      res.status(HTTP_INTERNAL_ERROR).json({
        error: "Unable to read session history",
      });
    }
  }

  private async handleFileDropCollect(res: Response): Promise<void> {
    try {
      const snapshot = await this.deps.fileDropService.collect();
      if (!snapshot) {
        res.status(HTTP_NO_CONTENT).end();
        return;
      }
      res.json({
        paths: snapshot.paths,
        formatted: snapshot.formatted,
      });
    } catch (error) {
      this.deps.logger.error("File drop capture failed", error as Error);
      res.status(HTTP_INTERNAL_ERROR).json({
        error: "Unable to capture file drop data",
      });
    }
  }

  private async handleIdeaContract(res: Response): Promise<void> {
    await this.handleWorkflowContract(res, buildIdeaContract, "Idea");
  }

  private async handleWorkflowContract(
    res: Response,
    builder: () => Promise<unknown>,
    label: string
  ): Promise<void> {
    try {
      const contract = await builder();
      if (!contract) {
        res.status(HTTP_NOT_FOUND).json({
          error: `${label} contract templates are unavailable`,
        });
        return;
      }
      res.json(contract);
    } catch (error) {
      this.deps.logger.error(`${label} contract build failed`, error as Error);
      res.status(HTTP_INTERNAL_ERROR).json({
        error: `Unable to build ${label.toLowerCase()} contract`,
      });
    }
  }

  private async handleArtifactUpsertSave(
    req: Request,
    res: Response
  ): Promise<void> {
    const parsedPayload = parseArtifactUpsertPayload(req.body as unknown);
    if (!parsedPayload.ok) {
      res.status(HTTP_BAD_REQUEST).json({ error: parsedPayload.error });
      return;
    }

    const { sessionId, artifacts } = parsedPayload.value;
    if (artifacts.length === 0) {
      res.status(HTTP_NO_CONTENT).end();
      return;
    }

    const session = this.deps.sessionManager.getSession(sessionId);
    if (!session) {
      res.status(HTTP_NOT_FOUND).json({
        error: `Session ${sessionId} not found`,
      });
      return;
    }

    const planResult = await buildWorkflowStageArtifactUpsertPlan({
      workspacePath: session.workspacePath,
      sessionContext: {
        initiativeSlug: session.initiativeSlug,
        runSlug: session.runSlug,
        stage: session.stage,
      },
      artifacts,
    });

    if (!planResult.ok) {
      res.status(HTTP_BAD_REQUEST).json({ error: planResult.error });
      return;
    }

    const writeResult = await writeArtifactUpsertPlan(planResult.value);
    if (!writeResult.ok) {
      this.deps.logger.error(
        "Failed to write artifact upserts",
        writeResult.error,
        {
          sessionId,
        }
      );
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to write artifact upsert" });
      return;
    }

    res.json({
      saved: planResult.value.upserts.map((upsert) => ({
        slot: upsert.slot,
        path: upsert.relativePath,
        changed: upsert.changed,
      })),
    });
  }

  private async handleIdeaArtifactSave(
    req: Request,
    res: Response
  ): Promise<void> {
    const parsedPayload = parseIdeaArtifactPayload(req.body as unknown);
    if (!parsedPayload.ok) {
      res.status(HTTP_BAD_REQUEST).json({ error: parsedPayload.error });
      return;
    }
    const { sessionId, paths } = parsedPayload.value;
    try {
      const planResult = await buildIdeaArtifactUpdatePlan(
        this.deps,
        parsedPayload.value
      );
      if (!planResult.ok) {
        res.status(planResult.status).json({ error: planResult.error });
        return;
      }
      const writeResult = await writeIdeaArtifactUpdatePlan(planResult.value);
      if (!writeResult.ok) {
        this.deps.logger.error(
          "Failed to write Idea artifacts",
          writeResult.error,
          {
            sessionId,
            ideaPath: paths.idea,
            virtualSimulationPath: paths.virtualSimulation,
          }
        );
        res
          .status(HTTP_INTERNAL_ERROR)
          .json({ error: "Unable to write artifact" });
        return;
      }
      res.json({
        paths: {
          idea: paths.idea,
          virtualSimulation: paths.virtualSimulation,
        },
      });
    } catch (error) {
      this.deps.logger.error("Failed to write Idea artifacts", error as Error, {
        sessionId,
        ideaPath: paths.idea,
        virtualSimulationPath: paths.virtualSimulation,
      });
      res
        .status(HTTP_INTERNAL_ERROR)
        .json({ error: "Unable to write artifact" });
    }
  }
}

type IdeaArtifactPayload = {
  readonly sessionId: string;
  readonly nextAction: "finalize" | "revise_artifacts";
  readonly ideaMarkdown: string | null;
  readonly virtualSimulationMarkdown: string | null;
  readonly patch: IdeaArtifactPatchEntry[] | null;
  readonly paths: {
    readonly idea: string;
    readonly virtualSimulation: string;
  };
};

type ArtifactUpsertItem = {
  readonly slot: string;
  readonly markdown: string;
};

type ArtifactUpsertPayload = {
  readonly sessionId: string;
  readonly artifacts: ArtifactUpsertItem[];
};

type ArtifactUpsertPayloadResult =
  | { readonly ok: true; readonly value: ArtifactUpsertPayload }
  | { readonly ok: false; readonly error: string };

type IdeaArtifactPayloadResult =
  | { readonly ok: true; readonly value: IdeaArtifactPayload }
  | { readonly ok: false; readonly error: string };

type IdeaArtifactPatchTarget = "idea" | "virtual_simulation";
type IdeaArtifactPatchOperation = "replace" | "append" | "prepend" | "remove";

type IdeaArtifactPatchEntry = {
  readonly target: IdeaArtifactPatchTarget;
  readonly section: string;
  readonly operation: IdeaArtifactPatchOperation;
  readonly content: string;
};

const parseIdeaArtifactPayload = (
  payload: unknown
): IdeaArtifactPayloadResult => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid payload" };
  }
  const candidate = payload as Record<string, unknown>;
  const sessionId = readNonEmptyString(candidate.sessionId);
  if (!sessionId) {
    return { ok: false, error: "Missing sessionId" };
  }
  const nextActionResult = parseNextAction(candidate);
  if (!nextActionResult.ok) {
    return { ok: false, error: nextActionResult.error };
  }
  const ideaMarkdown =
    readNonEmptyString(candidate.ideaMarkdown) ??
    readNonEmptyString(candidate.idea_markdown);
  const virtualSimulationMarkdown =
    readNonEmptyString(candidate.virtualSimulationMarkdown) ??
    readNonEmptyString(candidate.virtual_simulation_markdown);
  const patchParse = parsePatchList(candidate.patch);
  if (!patchParse.ok) {
    return { ok: false, error: patchParse.error };
  }
  const patch = patchParse.value.length > 0 ? patchParse.value : null;
  const payloadError = validateIdeaArtifactPayload({
    nextAction: nextActionResult.value,
    ideaMarkdown,
    virtualSimulationMarkdown,
    patch,
  });
  if (payloadError) {
    return { ok: false, error: payloadError };
  }
  const pathResult = parseIdeaArtifactPaths(candidate);
  if (!pathResult.ok) {
    return { ok: false, error: pathResult.error };
  }
  return {
    ok: true,
    value: {
      sessionId,
      nextAction: nextActionResult.value,
      ideaMarkdown,
      virtualSimulationMarkdown,
      patch,
      paths: pathResult.value,
    },
  };
};

const parseArtifactUpsertPayload = (
  payload: unknown
): ArtifactUpsertPayloadResult => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid payload" };
  }

  const candidate = payload as Record<string, unknown>;
  const sessionId = readNonEmptyString(candidate.sessionId);
  if (!sessionId) {
    return { ok: false, error: "Missing sessionId" };
  }

  const artifactsRaw = candidate.artifacts;
  if (!Array.isArray(artifactsRaw)) {
    return { ok: false, error: "Missing artifacts" };
  }

  const artifacts: ArtifactUpsertItem[] = [];
  for (const entry of artifactsRaw) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Invalid artifact entry" };
    }
    const record = entry as Record<string, unknown>;
    const slot = readNonEmptyString(record.slot);
    const markdown = readNonEmptyString(record.markdown);
    if (!(slot && markdown)) {
      return { ok: false, error: "Invalid artifact entry" };
    }
    artifacts.push({ slot, markdown });
  }

  return { ok: true, value: { sessionId, artifacts } };
};

type IdeaArtifactUpdatePlan = {
  readonly ideaPath: string;
  readonly virtualSimulationPath: string;
  readonly ideaContent: string;
  readonly virtualContent: string;
  readonly ideaChanged: boolean;
  readonly virtualChanged: boolean;
  readonly existingIdea: string | null;
  readonly existingVirtualSimulation: string | null;
  readonly nextAction: IdeaArtifactPayload["nextAction"];
};

type IdeaArtifactUpdatePlanResult =
  | { readonly ok: true; readonly value: IdeaArtifactUpdatePlan }
  | { readonly ok: false; readonly status: number; readonly error: string };

type IdeaArtifactWriteResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: Error };

type WorkflowStageArtifactUpsertPlan = {
  readonly upserts: readonly {
    readonly slot: string;
    readonly relativePath: string;
    readonly artifactPath: string;
    readonly content: string;
    readonly existingContent: string | null;
    readonly changed: boolean;
  }[];
};

type WorkflowStageArtifactUpsertPlanResult =
  | { readonly ok: true; readonly value: WorkflowStageArtifactUpsertPlan }
  | { readonly ok: false; readonly error: string };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "diagram_facades";

type WorkflowArtifactFileName =
  | "Final_Description.md"
  | "virtual-simulation.md"
  | "modules-diagram.mmd"
  | "facades-graph.mmd";

const WORKFLOW_STAGE_SET = new Set<WorkflowStageId>([
  "description",
  "virtual_simulation",
  "diagram_modules",
  "diagram_facades",
]);

const WORKFLOW_STAGE_SLOTS = new Map<
  string,
  { stage: WorkflowStageId; fileName: WorkflowArtifactFileName }
>([
  [
    "workspace.description",
    { stage: "description", fileName: "Final_Description.md" },
  ],
  [
    "workspace.virtual_simulation",
    { stage: "virtual_simulation", fileName: "virtual-simulation.md" },
  ],
  [
    "diagram.modules",
    { stage: "diagram_modules", fileName: "modules-diagram.mmd" },
  ],
  [
    "diagram.facades",
    { stage: "diagram_facades", fileName: "facades-graph.mmd" },
  ],
]);

const WORKFLOW_STAGE_PATHS = new Map<WorkflowStageId, RegExp>([
  ["description", DESCRIPTION_PATH_RE],
  ["virtual_simulation", VIRTUAL_SIMULATION_PATH_RE],
  ["diagram_modules", DIAGRAM_MODULES_PATH_RE],
  ["diagram_facades", DIAGRAM_FACADES_PATH_RE],
]);

type WorkflowStageUpsertContext = {
  readonly initiativeSlug: string;
  readonly workspaceRoot: string;
  readonly stage: WorkflowStageId;
};

type WorkflowStageUpsertTarget = {
  readonly fileName: WorkflowArtifactFileName;
  readonly relativePath: string;
  readonly artifactPath: string;
};

const resolveWorkflowStageUpsertContext = (params: {
  readonly workspacePath: string;
  readonly sessionContext: {
    readonly initiativeSlug: string | null;
    readonly runSlug: string | null;
    readonly stage: string | null;
  };
}): PayloadParseResult<WorkflowStageUpsertContext> => {
  const { initiativeSlug, stage } = params.sessionContext;
  if (!(initiativeSlug && stage)) {
    return {
      ok: false,
      error: "Session context is missing initiativeSlug/stage",
    };
  }
  if (!WORKFLOW_STAGE_SET.has(stage as WorkflowStageId)) {
    return { ok: false, error: `Unsupported stage: ${stage}` };
  }
  if (!SLUG_RE.test(initiativeSlug)) {
    return { ok: false, error: "Invalid initiativeSlug" };
  }
  return {
    ok: true,
    value: {
      initiativeSlug,
      workspaceRoot: path.resolve(params.workspacePath),
      stage: stage as WorkflowStageId,
    },
  };
};

const resolveWorkflowStageUpsertTarget = (params: {
  readonly context: WorkflowStageUpsertContext;
  readonly slot: string;
}): PayloadParseResult<WorkflowStageUpsertTarget> => {
  const slotInfo = WORKFLOW_STAGE_SLOTS.get(params.slot);
  if (!slotInfo) {
    return {
      ok: false,
      error: `Unsupported artifact slot: ${params.slot}`,
    };
  }
  if (slotInfo.stage !== params.context.stage) {
    return {
      ok: false,
      error: `Artifact slot ${params.slot} is not allowed for ${params.context.stage}`,
    };
  }

  const relativePath = `.codeai-hub/${params.context.initiativeSlug}/${slotInfo.stage}/${slotInfo.fileName}`;
  const isAllowed =
    WORKFLOW_STAGE_PATHS.get(slotInfo.stage)?.test(relativePath) ?? false;
  if (!isAllowed) {
    return { ok: false, error: "Invalid artifact path" };
  }

  const artifactPath = resolveArtifactPath(
    params.context.workspaceRoot,
    relativePath
  );
  if (!artifactPath) {
    return { ok: false, error: "Unsafe artifact path" };
  }

  return {
    ok: true,
    value: { fileName: slotInfo.fileName, relativePath, artifactPath },
  };
};

const normalizeAndValidateWorkflowStageUpsertMarkdown = (params: {
  readonly fileName: WorkflowArtifactFileName;
  readonly markdown: string;
}): PayloadParseResult<string> => {
  const normalizedContent = normalizeArtifactContent(params.markdown);
  const validationError = resolveWorkflowStageValidationError({
    fileName: params.fileName,
    content: normalizedContent,
    shouldValidate: true,
  });
  if (validationError) {
    return { ok: false, error: validationError };
  }
  return { ok: true, value: normalizedContent };
};

const buildWorkflowStageArtifactUpsertPlan = async (params: {
  readonly workspacePath: string;
  readonly sessionContext: {
    readonly initiativeSlug: string | null;
    readonly runSlug: string | null;
    readonly stage: string | null;
  };
  readonly artifacts: readonly ArtifactUpsertItem[];
}): Promise<WorkflowStageArtifactUpsertPlanResult> => {
  const contextResult = resolveWorkflowStageUpsertContext({
    workspacePath: params.workspacePath,
    sessionContext: params.sessionContext,
  });
  if (!contextResult.ok) {
    return { ok: false, error: contextResult.error };
  }
  const context = contextResult.value;

  const seenSlots = new Set<string>();
  const upserts: WorkflowStageArtifactUpsertPlan["upserts"][number][] = [];

  for (const artifact of params.artifacts) {
    if (seenSlots.has(artifact.slot)) {
      return { ok: false, error: `Duplicate artifact slot: ${artifact.slot}` };
    }
    seenSlots.add(artifact.slot);

    const targetResult = resolveWorkflowStageUpsertTarget({
      context,
      slot: artifact.slot,
    });
    if (!targetResult.ok) {
      return { ok: false, error: targetResult.error };
    }

    const contentResult = normalizeAndValidateWorkflowStageUpsertMarkdown({
      fileName: targetResult.value.fileName,
      markdown: artifact.markdown,
    });
    if (!contentResult.ok) {
      return { ok: false, error: contentResult.error };
    }

    const existingContent = await readArtifactFile(
      targetResult.value.artifactPath
    );
    const normalizedExisting =
      existingContent === null
        ? null
        : normalizeArtifactContent(existingContent);
    const changed = normalizedExisting !== contentResult.value;

    upserts.push({
      slot: artifact.slot,
      relativePath: targetResult.value.relativePath,
      artifactPath: targetResult.value.artifactPath,
      content: contentResult.value,
      existingContent,
      changed,
    });
  }

  return { ok: true, value: { upserts } };
};

const writeArtifactUpsertPlan = async (
  plan: WorkflowStageArtifactUpsertPlan
): Promise<IdeaArtifactWriteResult> => {
  const backups: ArtifactBackup[] = [];
  try {
    for (const upsert of plan.upserts) {
      if (!upsert.changed) {
        continue;
      }
      backups.push(
        await backupAndWriteArtifact(
          upsert.artifactPath,
          upsert.content,
          upsert.existingContent
        )
      );
    }
    return { ok: true };
  } catch (error) {
    await restoreBackups(backups);
    const failure = error instanceof Error ? error : new Error(String(error));
    return { ok: false, error: failure };
  }
};

const buildIdeaArtifactUpdatePlan = async (
  deps: RouterDependencies,
  payload: IdeaArtifactPayload
): Promise<IdeaArtifactUpdatePlanResult> => {
  const session = deps.sessionManager.getSession(payload.sessionId);
  if (!session) {
    return {
      ok: false,
      status: HTTP_NOT_FOUND,
      error: `Session ${payload.sessionId} not found`,
    };
  }
  if (!isAllowedIdeaArtifactPaths(payload.paths)) {
    return {
      ok: false,
      status: HTTP_BAD_REQUEST,
      error:
        "Invalid artifact paths (expected .codeai-hub/<workspaceSlug>/description/runs/<runSlug>/idea/...)",
    };
  }
  const workspaceRoot = path.resolve(session.workspacePath);
  const ideaPath = resolveArtifactPath(workspaceRoot, payload.paths.idea);
  const virtualSimulationPath = resolveArtifactPath(
    workspaceRoot,
    payload.paths.virtualSimulation
  );
  if (!(ideaPath && virtualSimulationPath)) {
    return {
      ok: false,
      status: HTTP_BAD_REQUEST,
      error: "Unsafe artifact path",
    };
  }
  const [existingIdea, existingVirtualSimulation] = await Promise.all([
    readArtifactFile(ideaPath),
    readArtifactFile(virtualSimulationPath),
  ]);
  const ideaUpdate = resolveArtifactUpdate({
    target: "idea",
    existingContent: existingIdea,
    fullMarkdown: payload.ideaMarkdown,
    patchEntries: payload.patch ?? [],
    nextAction: payload.nextAction,
  });
  if (!ideaUpdate.ok) {
    return {
      ok: false,
      status: HTTP_BAD_REQUEST,
      error: ideaUpdate.error,
    };
  }
  const virtualUpdate = resolveArtifactUpdate({
    target: "virtual_simulation",
    existingContent: existingVirtualSimulation,
    fullMarkdown: payload.virtualSimulationMarkdown,
    patchEntries: payload.patch ?? [],
    nextAction: payload.nextAction,
  });
  if (!virtualUpdate.ok) {
    return {
      ok: false,
      status: HTTP_BAD_REQUEST,
      error: virtualUpdate.error,
    };
  }

  const ideaContent = normalizeArtifactContent(ideaUpdate.value.content);
  const virtualContent = normalizeArtifactContent(virtualUpdate.value.content);
  const shouldValidate =
    payload.nextAction === "finalize" ||
    ideaUpdate.value.changed ||
    virtualUpdate.value.changed;
  const ideaValidationError = validateIdeaMarkdown(ideaContent, shouldValidate);
  if (ideaValidationError) {
    return {
      ok: false,
      status: HTTP_BAD_REQUEST,
      error: ideaValidationError,
    };
  }
  const virtualValidationError = validateVirtualSimulationMarkdown(
    virtualContent,
    shouldValidate
  );
  if (virtualValidationError) {
    return {
      ok: false,
      status: HTTP_BAD_REQUEST,
      error: virtualValidationError,
    };
  }
  return {
    ok: true,
    value: {
      ideaPath,
      virtualSimulationPath,
      ideaContent,
      virtualContent,
      ideaChanged: ideaUpdate.value.changed,
      virtualChanged: virtualUpdate.value.changed,
      existingIdea,
      existingVirtualSimulation,
      nextAction: payload.nextAction,
    },
  };
};

const writeIdeaArtifactUpdatePlan = async (
  plan: IdeaArtifactUpdatePlan
): Promise<IdeaArtifactWriteResult> => {
  const backups: ArtifactBackup[] = [];
  try {
    if (plan.ideaChanged) {
      backups.push(
        await backupAndWriteArtifact(
          plan.ideaPath,
          plan.ideaContent,
          plan.existingIdea
        )
      );
    }
    if (plan.virtualChanged) {
      backups.push(
        await backupAndWriteArtifact(
          plan.virtualSimulationPath,
          plan.virtualContent,
          plan.existingVirtualSimulation
        )
      );
    }
    return { ok: true };
  } catch (error) {
    await restoreBackups(backups);
    const failure = error instanceof Error ? error : new Error(String(error));
    return { ok: false, error: failure };
  }
};

const isAllowedIdeaArtifactPaths = (paths: {
  readonly idea: string;
  readonly virtualSimulation: string;
}): boolean =>
  LEGACY_IDEA_PATH_RE.test(paths.idea) &&
  LEGACY_VIRTUAL_SIMULATION_PATH_RE.test(paths.virtualSimulation);

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
};

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

type PatchParseResult =
  | { readonly ok: true; readonly value: IdeaArtifactPatchEntry[] }
  | { readonly ok: false; readonly error: string };

type PayloadParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

const PATCH_TARGETS = new Set<IdeaArtifactPatchTarget>([
  "idea",
  "virtual_simulation",
]);
const PATCH_OPERATIONS = new Set<IdeaArtifactPatchOperation>([
  "replace",
  "append",
  "prepend",
  "remove",
]);
const LINE_SPLIT_RE = /\r?\n/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const DESCRIPTION_TITLE_RE = /^#\s+Description:/m;
const IDEA_TITLE_RE = /^#\s+Idea:/m;
const VIRTUAL_SIMULATION_TITLE_RE = /^#\s+Virtual Simulation:/m;
const VIRTUAL_SIMULATION_SCENARIO_RE = /^##\s+(?:Сценарий|Scenario)\s+\d+\b/gm;
const MERMAID_FLOWCHART_RE = /^\s*flowchart\s+/m;

const parsePatchList = (patchValue: unknown): PatchParseResult => {
  if (patchValue === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(patchValue)) {
    return { ok: false, error: "Invalid patch payload" };
  }
  const entries: IdeaArtifactPatchEntry[] = [];
  for (const entry of patchValue) {
    const parsed = parsePatchEntry(entry);
    if (!parsed) {
      return { ok: false, error: "Invalid patch entry" };
    }
    entries.push(parsed);
  }
  return { ok: true, value: entries };
};

const parsePatchEntry = (entry: unknown): IdeaArtifactPatchEntry | null => {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const target = readString(candidate.target);
  if (!(target && PATCH_TARGETS.has(target as IdeaArtifactPatchTarget))) {
    return null;
  }
  const section = readNonEmptyString(candidate.section);
  if (!section) {
    return null;
  }
  const operation = readString(candidate.operation);
  if (
    !(
      operation && PATCH_OPERATIONS.has(operation as IdeaArtifactPatchOperation)
    )
  ) {
    return null;
  }
  const content = readString(candidate.content);
  if (content === null) {
    return null;
  }
  return {
    target: target as IdeaArtifactPatchTarget,
    section,
    operation: operation as IdeaArtifactPatchOperation,
    content,
  };
};

const parseNextAction = (
  candidate: Record<string, unknown>
): PayloadParseResult<IdeaArtifactPayload["nextAction"]> => {
  const nextActionRaw =
    readString(candidate.nextAction) ?? readString(candidate.next_action);
  if (!nextActionRaw) {
    return { ok: true, value: "finalize" };
  }
  if (nextActionRaw === "finalize" || nextActionRaw === "revise_artifacts") {
    return { ok: true, value: nextActionRaw };
  }
  return { ok: false, error: "Invalid nextAction" };
};

const parseIdeaArtifactPaths = (
  candidate: Record<string, unknown>
): PayloadParseResult<IdeaArtifactPayload["paths"]> => {
  const ideaPath =
    readNonEmptyString(candidate.ideaPath) ??
    readNonEmptyString(candidate.idea_path);
  const virtualSimulationPath =
    readNonEmptyString(candidate.virtualSimulationPath) ??
    readNonEmptyString(candidate.virtual_simulation_path);
  if (!ideaPath) {
    return { ok: false, error: "Missing ideaPath" };
  }
  if (!virtualSimulationPath) {
    return { ok: false, error: "Missing virtualSimulationPath" };
  }
  return {
    ok: true,
    value: {
      idea: ideaPath,
      virtualSimulation: virtualSimulationPath,
    },
  };
};

const validateIdeaArtifactPayload = (params: {
  readonly nextAction: IdeaArtifactPayload["nextAction"];
  readonly ideaMarkdown: string | null;
  readonly virtualSimulationMarkdown: string | null;
  readonly patch: IdeaArtifactPatchEntry[] | null;
}): string | null => {
  const hasFull =
    Boolean(params.ideaMarkdown) && Boolean(params.virtualSimulationMarkdown);
  const hasPatch = Boolean(params.patch);
  if (params.nextAction === "finalize" && !hasFull) {
    return "Missing artifact markdown for finalize";
  }
  if (params.nextAction === "revise_artifacts" && !(hasFull || hasPatch)) {
    return "Missing artifact patch or markdown for revise_artifacts";
  }
  return null;
};

type ArtifactUpdateResult =
  | { readonly ok: true; readonly value: { content: string; changed: boolean } }
  | { readonly ok: false; readonly error: string };

const resolveArtifactUpdate = (params: {
  readonly target: IdeaArtifactPatchTarget;
  readonly existingContent: string | null;
  readonly fullMarkdown: string | null;
  readonly patchEntries: IdeaArtifactPatchEntry[];
  readonly nextAction: IdeaArtifactPayload["nextAction"];
}): ArtifactUpdateResult => {
  const targetLabel =
    params.target === "idea" ? "Final_Description.md" : "virtual-simulation.md";
  if (params.nextAction === "finalize") {
    if (!params.fullMarkdown) {
      return { ok: false, error: `Missing ${targetLabel} content` };
    }
    return {
      ok: true,
      value: { content: params.fullMarkdown, changed: true },
    };
  }
  const patchEntries = params.patchEntries.filter(
    (entry) => entry.target === params.target
  );
  if (patchEntries.length > 0) {
    if (!params.existingContent) {
      return {
        ok: false,
        error: `Missing existing ${targetLabel} for patch application`,
      };
    }
    const patchResult = applyPatchToContent(
      params.existingContent,
      patchEntries
    );
    if (!patchResult.ok) {
      return { ok: false, error: patchResult.error };
    }
    return {
      ok: true,
      value: { content: patchResult.value, changed: true },
    };
  }
  if (params.fullMarkdown) {
    return { ok: true, value: { content: params.fullMarkdown, changed: true } };
  }
  if (!params.existingContent) {
    return {
      ok: false,
      error: `Missing existing ${targetLabel} for revise_artifacts`,
    };
  }
  return {
    ok: true,
    value: { content: params.existingContent, changed: false },
  };
};

type PatchApplyResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: string };

const applyPatchToContent = (
  content: string,
  patchEntries: IdeaArtifactPatchEntry[]
): PatchApplyResult => {
  let lines = content.split(LINE_SPLIT_RE);
  for (const entry of patchEntries) {
    const result = applyPatchEntry(lines, entry);
    if (!result.ok) {
      return result;
    }
    lines = result.value;
  }
  return { ok: true, value: lines.join("\n") };
};

type PatchEntryApplyResult =
  | { readonly ok: true; readonly value: string[] }
  | { readonly ok: false; readonly error: string };

const applyPatchEntry = (
  lines: string[],
  entry: IdeaArtifactPatchEntry
): PatchEntryApplyResult => {
  const range = findSectionRange(lines, entry.section);
  if (!range) {
    return {
      ok: false,
      error: `Section not found: ${entry.section}`,
    };
  }
  const contentLines =
    entry.content.length > 0 ? entry.content.split(LINE_SPLIT_RE) : [];
  switch (entry.operation) {
    case "replace": {
      const next = [
        ...lines.slice(0, range.start + 1),
        ...contentLines,
        ...lines.slice(range.end),
      ];
      return { ok: true, value: next };
    }
    case "append": {
      const next = [
        ...lines.slice(0, range.end),
        ...contentLines,
        ...lines.slice(range.end),
      ];
      return { ok: true, value: next };
    }
    case "prepend": {
      const next = [
        ...lines.slice(0, range.start + 1),
        ...contentLines,
        ...lines.slice(range.start + 1),
      ];
      return { ok: true, value: next };
    }
    case "remove": {
      const next = [...lines.slice(0, range.start), ...lines.slice(range.end)];
      return { ok: true, value: next };
    }
    default:
      return {
        ok: false,
        error: `Unsupported operation: ${entry.operation}`,
      };
  }
};

type SectionStart = { index: number; level: number };

const findSectionRange = (
  lines: string[],
  section: string
): { start: number; end: number } | null => {
  const normalizedTarget = normalizeHeading(section);
  const start = findSectionStart(lines, normalizedTarget);
  if (!start) {
    return null;
  }
  const end = findSectionEnd(lines, start.index, start.level);
  return { start: start.index, end };
};

const findSectionStart = (
  lines: string[],
  normalizedTarget: string
): SectionStart | null => {
  for (let index = 0; index < lines.length; index += 1) {
    const match = HEADING_RE.exec(lines[index]);
    if (!match) {
      continue;
    }
    const heading = normalizeHeading(match[2] ?? "");
    if (heading === normalizedTarget) {
      return { index, level: match[1]?.length ?? 0 };
    }
  }
  return null;
};

const findSectionEnd = (
  lines: string[],
  startIndex: number,
  level: number
): number => {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const match = HEADING_RE.exec(lines[index]);
    if (!match) {
      continue;
    }
    const nextLevel = match[1]?.length ?? 0;
    if (nextLevel <= level) {
      return index;
    }
  }
  return lines.length;
};

const normalizeHeading = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const normalizeArtifactContent = (content: string): string =>
  content.endsWith("\n") ? content : `${content}\n`;

const resolveWorkflowStageValidationError = (params: {
  readonly fileName: WorkflowArtifactFileName;
  readonly content: string;
  readonly shouldValidate: boolean;
}): string | null => {
  switch (params.fileName) {
    case "Final_Description.md":
      return validateDescriptionMarkdown(params.content, params.shouldValidate);
    case "virtual-simulation.md":
      return validateVirtualSimulationMarkdown(
        params.content,
        params.shouldValidate
      );
    case "modules-diagram.mmd":
    case "facades-graph.mmd":
      return validateMermaidDiagramMarkdown(
        params.content,
        params.shouldValidate
      );
    default:
      return "Unsupported artifact file";
  }
};

const validateDescriptionMarkdown = (
  content: string,
  shouldValidate: boolean
): string | null => {
  if (!shouldValidate) {
    return null;
  }
  if (content.trim().length === 0) {
    return "Description markdown is empty";
  }
  if (!DESCRIPTION_TITLE_RE.test(content)) {
    return "Description markdown is missing '# Description:' header";
  }
  return null;
};

const validateIdeaMarkdown = (
  content: string,
  shouldValidate: boolean
): string | null => {
  if (!shouldValidate) {
    return null;
  }
  if (content.trim().length === 0) {
    return "Idea markdown is empty";
  }
  if (!IDEA_TITLE_RE.test(content)) {
    return "Idea markdown is missing '# Idea:' header";
  }
  return null;
};

const validateVirtualSimulationMarkdown = (
  content: string,
  shouldValidate: boolean
): string | null => {
  if (!shouldValidate) {
    return null;
  }
  if (content.trim().length === 0) {
    return "virtual-simulation markdown is empty";
  }
  if (!VIRTUAL_SIMULATION_TITLE_RE.test(content)) {
    return "virtual-simulation markdown is missing '# Virtual Simulation' header";
  }
  const scenarioMatches = content.match(VIRTUAL_SIMULATION_SCENARIO_RE);
  const scenarioCount = scenarioMatches?.length ?? 0;
  if (scenarioCount < 2) {
    return "virtual-simulation markdown must include at least 2 scenarios (## Сценарий N)";
  }
  if (scenarioCount > 4) {
    return "virtual-simulation markdown must include at most 4 scenarios";
  }
  return null;
};

const validateMermaidDiagramMarkdown = (
  content: string,
  shouldValidate: boolean
): string | null => {
  if (!shouldValidate) {
    return null;
  }
  if (content.trim().length === 0) {
    return "Diagram markdown is empty";
  }
  if (!MERMAID_FLOWCHART_RE.test(content)) {
    return "Diagram markdown is missing 'flowchart' declaration";
  }
  return null;
};

type ArtifactBackup = {
  readonly path: string;
  readonly previousContent: string | null;
  readonly backupPath: string | null;
};

const backupAndWriteArtifact = async (
  artifactPath: string,
  content: string,
  existingContent: string | null
): Promise<ArtifactBackup> => {
  const backupPath =
    existingContent === null ? null : buildBackupPath(artifactPath);
  if (backupPath && existingContent !== null) {
    await writeFile(backupPath, existingContent, { encoding: "utf8" });
  }
  await writeArtifactFile(artifactPath, content);
  return { path: artifactPath, previousContent: existingContent, backupPath };
};

const restoreBackups = async (backups: ArtifactBackup[]): Promise<void> => {
  for (const backup of backups) {
    if (backup.previousContent === null) {
      continue;
    }
    await writeArtifactFile(backup.path, backup.previousContent);
  }
};

const buildBackupPath = (artifactPath: string): string => {
  const timestamp = new Date().toISOString().replace(/[^\d]/g, "");
  return `${artifactPath}.bak-${timestamp}`;
};

const readArtifactFile = async (
  artifactPath: string
): Promise<string | null> => {
  try {
    return await readFile(artifactPath, { encoding: "utf8" });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null
        ? (error as { code?: string }).code
        : null;
    if (code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const resolveArtifactPath = (
  workspaceRoot: string,
  relativePath: string
): string | null => {
  const artifactPath = path.resolve(workspaceRoot, relativePath);
  if (!artifactPath.startsWith(`${workspaceRoot}${path.sep}`)) {
    return null;
  }
  return artifactPath;
};

const writeArtifactFile = async (
  artifactPath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, content, { encoding: "utf8" });
};
