import type { ProviderStackId } from "../../../types/provider";
import { api } from "../api";
import { IDEA_KICKOFF_PROMPT } from "../../ui/src/app-host/idea-kickoff-prompt";
import { IDEA_COLLECTOR_FALLBACK_SCHEMA } from "../../ui/src/services/idea-collector-fallback-schema";
import { extractIdeaCollectorArtifact } from "../../ui/src/services/idea-collector-artifact";
import { normalizeIdeaCollectorSchema } from "../../ui/src/services/idea-collector-schema-utils";
import { persistIdeaArtifacts } from "../../ui/src/services/idea-artifact-persistence";
import { buildQuestionnaireSubmissionMessage } from "../../ui/src/services/idea-questionnaire-messages";
import {
  isRecord,
  joinUrl,
  resolveCoreHttpUrl,
  resolveWorkspaceName,
  toWorkspaceSlug,
} from "./description-questionnaire-utils";

const SESSION_CREATE_TIMEOUT_MS = 15000;
const WORKFLOW_CONTRACT_ENDPOINTS = {
  description: "/api/v1/orchestrator/description-contract",
  virtual_simulation: "/api/v1/orchestrator/virtual-simulation-contract",
  diagram_modules: "/api/v1/orchestrator/diagram-modules-contract",
  diagram_facades: "/api/v1/orchestrator/diagram-facades-contract",
} as const;
const WORKFLOW_STAGE_SLOT_LINES = {
  description: ["- description.md: workspace.description"],
  virtual_simulation: ["- virtual-simulation.md: workspace.virtual_simulation"],
  diagram_modules: ["- modules-diagram.mmd: diagram.modules"],
  diagram_facades: ["- facades-graph.mmd: diagram.facades"],
} as const;
export type WorkflowStageId = keyof typeof WORKFLOW_CONTRACT_ENDPOINTS;

type WorkflowContractSnapshot = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
};
type SessionCreatedPayload = {
  readonly id: string;
  readonly workspacePath?: string;
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
};

type SessionStreamPayload = {
  readonly sessionId?: string;
  readonly event?: unknown;
};
type SessionErrorPayload = {
  readonly sessionId?: string;
  readonly message: string;
};

let streamListenerReady = false;
const cachedWorkflowSchemas = new Map<WorkflowStageId, Record<string, unknown>>();
const pendingWorkflowSchemas = new Map<WorkflowStageId, Promise<Record<string, unknown>>>();

const buildPromptWithSlots = (prompt: string, stage: WorkflowStageId): string =>
  `${prompt}\n\nСлоты сохранения для этой сессии (используй в Structured Output):\n${WORKFLOW_STAGE_SLOT_LINES[stage].join("\n")}`;

const normalizeWorkflowContract = (
  payload: unknown
): WorkflowContractSnapshot | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const prompt = typeof payload.prompt === "string" ? payload.prompt : null;
  const schema =
    payload.schema && isRecord(payload.schema)
      ? (payload.schema as Record<string, unknown>)
      : null;
  if (!(prompt && schema)) {
    return null;
  }
  return { prompt, schema: normalizeIdeaCollectorSchema(schema, null) };
};
const loadWorkflowContract = async (
  stage: WorkflowStageId
): Promise<WorkflowContractSnapshot> => {
  const httpUrl = resolveCoreHttpUrl();
  const fallback = {
    prompt: IDEA_KICKOFF_PROMPT,
    schema: normalizeIdeaCollectorSchema(IDEA_COLLECTOR_FALLBACK_SCHEMA, null),
  };
  if (!httpUrl) {
    return fallback;
  }

  try {
    const response = await fetch(
      joinUrl(httpUrl, WORKFLOW_CONTRACT_ENDPOINTS[stage])
    );
    if (!response.ok) {
      return fallback;
    }
    const payload = (await response.json()) as unknown;
    return normalizeWorkflowContract(payload) ?? fallback;
  } catch {
    return fallback;
  }
};
const extractSessionCreatedPayload = (
  payload: unknown
): SessionCreatedPayload | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const id = typeof payload.id === "string" ? payload.id : null;
  if (!id) {
    return null;
  }
  const workspacePath =
    typeof payload.workspacePath === "string"
      ? payload.workspacePath
      : undefined;
  const initiativeSlug =
    typeof payload.initiativeSlug === "string"
      ? payload.initiativeSlug
      : null;
  const stage = typeof payload.stage === "string" ? payload.stage : null;
  return { id, workspacePath, initiativeSlug, stage };
};
const extractSessionStreamPayload = (
  payload: unknown
): SessionStreamPayload | null => {
  if (!isRecord(payload)) {
    return null;
  }
  return {
    sessionId:
      typeof payload.sessionId === "string" ? payload.sessionId : undefined,
    event: "event" in payload ? payload.event : undefined,
  };
};
const extractSessionErrorPayload = (
  payload: unknown
): SessionErrorPayload | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const message = typeof payload.message === "string" ? payload.message : null;
  if (!message) {
    return null;
  }
  const sessionId =
    typeof payload.sessionId === "string" ? payload.sessionId : undefined;
  return { sessionId, message };
};
const ensureStreamListener = (): void => {
  if (streamListenerReady) {
    return;
  }
  streamListenerReady = true;
  api.onCoreEvent((message) => {
    if (message.type !== "session:stream") {
      return;
    }
    const payload = extractSessionStreamPayload(message.payload);
    if (!payload?.sessionId) {
      return;
    }
    const artifact = extractIdeaCollectorArtifact(payload.event);
    if (!artifact) {
      return;
    }
    const httpUrl = resolveCoreHttpUrl();
    if (!httpUrl) {
      return;
    }
    void persistIdeaArtifacts({
      httpUrl,
      sessionId: payload.sessionId,
      artifact,
    }).catch(() => {
      /* ignore persistence errors */
    });
  });
};
export const loadWorkflowSchemaForProjectManager = async (
  stage: WorkflowStageId
): Promise<Record<string, unknown>> => {
  const cachedSchema = cachedWorkflowSchemas.get(stage);
  if (cachedSchema) {
    return cachedSchema;
  }
  const pendingSchema = pendingWorkflowSchemas.get(stage);
  if (pendingSchema) {
    return pendingSchema;
  }
  const pending = loadWorkflowContract(stage)
    .then((contract) => {
      cachedWorkflowSchemas.set(stage, contract.schema);
      return contract.schema;
    })
    .finally(() => {
      pendingWorkflowSchemas.delete(stage);
    });
  pendingWorkflowSchemas.set(stage, pending);
  return pending;
};
const createIdeaCollectorSession = async (params: {
  readonly workspacePath: string;
  readonly initiativeSlug: string;
  readonly stage: WorkflowStageId;
  readonly providerId?: ProviderStackId;
}): Promise<string> =>
  new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = window.setTimeout(() => {
      if (resolved) {
        return;
      }
      resolved = true;
      unsubscribe();
      reject(new Error("Session creation timed out."));
    }, SESSION_CREATE_TIMEOUT_MS);

    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type === "session:error") {
        const errorPayload = extractSessionErrorPayload(message.payload);
        if (!errorPayload || errorPayload.sessionId) {
          return;
        }
        if (resolved) {
          return;
        }
        resolved = true;
        window.clearTimeout(timeout);
        unsubscribe();
        reject(new Error(errorPayload.message));
        return;
      }
      if (message.type !== "session:created") {
        return;
      }
      const payload = extractSessionCreatedPayload(message.payload);
      if (!payload) {
        return;
      }
      if (
        payload.workspacePath !== params.workspacePath ||
        payload.initiativeSlug !== params.initiativeSlug ||
        payload.stage !== params.stage
      ) {
        return;
      }
      if (resolved) {
        return;
      }
      resolved = true;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(payload.id);
    });

    api.createSession({
      providerId: params.providerId,
      workspacePath: params.workspacePath,
      initiativeSlug: params.initiativeSlug,
      stage: params.stage,
    });
  });
export class IdeaCollectorSubmitService {
  async submitQuestionnaire(params: {
    readonly workspaceName?: string;
    readonly workspacePath: string;
    readonly questionnairePath: string;
    readonly stage?: WorkflowStageId;
    readonly providerId?: ProviderStackId;
  }): Promise<string> {
    const workspaceName = resolveWorkspaceName({
      name: params.workspaceName,
      path: params.workspacePath,
    });
    const initiativeSlug = toWorkspaceSlug(workspaceName);
    const stage = params.stage ?? "description";
    const sessionId = await createIdeaCollectorSession({
      workspacePath: params.workspacePath,
      initiativeSlug,
      stage,
      providerId: params.providerId,
    });

    ensureStreamListener();

    const contract = await loadWorkflowContract(stage);
    const submissionMessage = buildQuestionnaireSubmissionMessage(
      params.questionnairePath
    );
    const content = `${buildPromptWithSlots(
      contract.prompt,
      stage
    )}\n\n${submissionMessage}`;

    api.sendSessionMessage(sessionId, content, {
      outputSchema: contract.schema,
    });

    return sessionId;
  }
}
