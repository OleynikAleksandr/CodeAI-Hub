import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Express, Request, Response } from "express";
import type { FileDropService } from "../../file-drop/file-drop-service";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { UnifiedSessionStorage } from "../../unified-session/storage";
import {
  parseFacadeMapDsl,
  parseModuleMapDsl,
} from "../../workflow/diagram-dsl/markdown-dsl-parser";
import { materializeModuleMapFromInventoryDsl } from "../../workflow/diagram-dsl/module-inventory-parser";
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
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/diagram_modules\/(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?(?:module-inventory\.md|module-map\.md|module-map\.flow\.json|module-map\.agent-baseline\.md)$/;
const DIAGRAM_FACADES_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/diagram_facades\/(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?(?:facade-map\.md|facade-map\.flow\.json|facade-map\.agent-baseline\.md)$/;

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
}

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

type ArtifactWriteResult =
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
  | "module-inventory.md"
  | "module-map.md"
  | "module-map.flow.json"
  | "module-map.agent-baseline.md"
  | "facade-map.md"
  | "facade-map.flow.json"
  | "facade-map.agent-baseline.md";

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
    "diagram.modules.inventory",
    { stage: "diagram_modules", fileName: "module-inventory.md" },
  ],
  ["diagram.modules", { stage: "diagram_modules", fileName: "module-map.md" }],
  [
    "diagram.modules.flow",
    { stage: "diagram_modules", fileName: "module-map.flow.json" },
  ],
  [
    "diagram.modules.baseline",
    { stage: "diagram_modules", fileName: "module-map.agent-baseline.md" },
  ],
  ["diagram.facades", { stage: "diagram_facades", fileName: "facade-map.md" }],
  [
    "diagram.facades.flow",
    { stage: "diagram_facades", fileName: "facade-map.flow.json" },
  ],
  [
    "diagram.facades.baseline",
    { stage: "diagram_facades", fileName: "facade-map.agent-baseline.md" },
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

  const derivedUpsertsResult = await buildDerivedDiagramModulesUpserts({
    context,
    upserts,
  });
  if (!derivedUpsertsResult.ok) {
    return { ok: false, error: derivedUpsertsResult.error };
  }

  return { ok: true, value: { upserts: derivedUpsertsResult.value } };
};

const buildDerivedDiagramModulesUpserts = async (params: {
  readonly context: WorkflowStageUpsertContext;
  readonly upserts: WorkflowStageArtifactUpsertPlan["upserts"];
}): Promise<PayloadParseResult<WorkflowStageArtifactUpsertPlan["upserts"]>> => {
  if (
    params.context.stage !== "diagram_modules" ||
    params.upserts.some((upsert) => upsert.slot === "diagram.modules")
  ) {
    return { ok: true, value: params.upserts };
  }

  const inventoryUpsert = params.upserts.find(
    (upsert) => upsert.slot === "diagram.modules.inventory"
  );
  if (!inventoryUpsert) {
    return { ok: true, value: params.upserts };
  }

  const materialization = materializeModuleMapFromInventoryDsl(
    inventoryUpsert.content
  );
  if (!materialization.ok) {
    return {
      ok: false,
      error: `Unable to derive module-map.md: line ${materialization.error.line}, ${materialization.error.message}`,
    };
  }

  const targetResult = resolveWorkflowStageUpsertTarget({
    context: params.context,
    slot: "diagram.modules",
  });
  if (!targetResult.ok) {
    return targetResult;
  }

  const contentResult = normalizeAndValidateWorkflowStageUpsertMarkdown({
    fileName: targetResult.value.fileName,
    markdown: materialization.content,
  });
  if (!contentResult.ok) {
    return { ok: false, error: contentResult.error };
  }

  const existingContent = await readArtifactFile(
    targetResult.value.artifactPath
  );
  const normalizedExisting =
    existingContent === null ? null : normalizeArtifactContent(existingContent);

  return {
    ok: true,
    value: [
      ...params.upserts,
      {
        slot: "diagram.modules",
        relativePath: targetResult.value.relativePath,
        artifactPath: targetResult.value.artifactPath,
        content: contentResult.value,
        existingContent,
        changed: normalizedExisting !== contentResult.value,
      },
    ],
  };
};

const writeArtifactUpsertPlan = async (
  plan: WorkflowStageArtifactUpsertPlan
): Promise<ArtifactWriteResult> => {
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

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
};

type PayloadParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };
const DESCRIPTION_TITLE_RE = /^#\s+Description:/m;
const VIRTUAL_SIMULATION_TITLE_RE = /^#\s+Virtual Simulation:/m;
const MODULE_INVENTORY_TITLE_RE = /^#\s+Module Inventory/m;
const VIRTUAL_SIMULATION_SCENARIO_RE = /^##\s+(?:Сценарий|Scenario)\s+\d+\b/gm;

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
    case "module-inventory.md":
      return validateModuleInventoryMarkdown(
        params.content,
        params.shouldValidate
      );
    case "module-map.md":
    case "module-map.agent-baseline.md":
      return validateMarkdownDslDiagram({
        content: params.content,
        parser: parseModuleMapDsl,
        shouldValidate: params.shouldValidate,
      });
    case "facade-map.md":
    case "facade-map.agent-baseline.md":
      return validateMarkdownDslDiagram({
        content: params.content,
        parser: parseFacadeMapDsl,
        shouldValidate: params.shouldValidate,
      });
    case "module-map.flow.json":
    case "facade-map.flow.json":
      return validateDiagramFlowSidecar(params.content, params.shouldValidate);
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

const validateModuleInventoryMarkdown = (
  content: string,
  shouldValidate: boolean
): string | null => {
  if (!shouldValidate) {
    return null;
  }
  if (content.trim().length === 0) {
    return "Module inventory markdown is empty";
  }
  if (!MODULE_INVENTORY_TITLE_RE.test(content)) {
    return "Module inventory markdown is missing '# Module Inventory' header";
  }
  return null;
};

const validateMarkdownDslDiagram = (params: {
  readonly content: string;
  readonly parser: typeof parseModuleMapDsl | typeof parseFacadeMapDsl;
  readonly shouldValidate: boolean;
}): string | null => {
  if (!params.shouldValidate) {
    return null;
  }
  if (params.content.trim().length === 0) {
    return "Diagram DSL markdown is empty";
  }
  const result = params.parser(params.content);
  return result.ok ? null : result.error.message;
};

const validateDiagramFlowSidecar = (
  content: string,
  shouldValidate: boolean
): string | null => {
  if (!shouldValidate) {
    return null;
  }
  if (content.trim().length === 0) {
    return "Diagram flow sidecar is empty";
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? null
      : "Diagram flow sidecar must be a JSON object";
  } catch {
    return "Diagram flow sidecar is not valid JSON";
  }
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
