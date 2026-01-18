import type { ProviderStackId } from "../../../types/provider";
import { api } from "../api";
import { IDEA_KICKOFF_PROMPT } from "../../ui/src/app-host/idea-kickoff-prompt";
import { IDEA_COLLECTOR_FALLBACK_SCHEMA } from "../../ui/src/services/idea-collector-fallback-schema";
import { normalizeIdeaCollectorSchema } from "../../ui/src/services/idea-collector-schema-utils";
import { notifyMissingIdeaContext } from "../../ui/src/services/idea-questionnaire-messages";
import {
  isRecord,
  isWorkspaceFileResponse,
  joinUrl,
  resolveCoreHttpUrl,
  resolveWorkspaceName,
  toWorkspaceSlug,
  type WorkspaceFileResponse,
} from "./description-questionnaire-utils";
import { buildWorkflowPromptPack } from "./prompt-pack-builder";

const SESSION_CREATE_TIMEOUT_MS = 15000;
const WORKFLOW_CONTRACT_ENDPOINTS = {
  description: "/api/v1/orchestrator/description-contract",
  virtual_simulation: "/api/v1/orchestrator/virtual-simulation-contract",
  diagram_modules: "/api/v1/orchestrator/diagram-modules-contract",
  diagram_facades: "/api/v1/orchestrator/diagram-facades-contract",
} as const;
const WORKSPACE_FILE_ENDPOINT = "/api/v1/orchestrator/workspace-file";
export type WorkflowStageId = keyof typeof WORKFLOW_CONTRACT_ENDPOINTS;

type WorkflowContractSnapshot = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly template: string;
};
type SessionCreatedPayload = {
  readonly id: string;
  readonly workspacePath?: string;
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly runSlug?: string | null;
};
type SessionErrorPayload = {
  readonly sessionId?: string;
  readonly message: string;
};

const cachedWorkflowSchemas = new Map<WorkflowStageId, Record<string, unknown>>();
const pendingWorkflowSchemas = new Map<WorkflowStageId, Promise<Record<string, unknown>>>();

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
  const template =
    typeof payload.template === "string" ? payload.template : "";
  if (!(prompt && schema)) {
    return null;
  }
  return {
    prompt,
    schema: normalizeIdeaCollectorSchema(
      schema,
      template.trim().length > 0 ? template : null
    ),
    template,
  };
};
const loadWorkflowContract = async (
  stage: WorkflowStageId
): Promise<WorkflowContractSnapshot> => {
  const httpUrl = resolveCoreHttpUrl();
  const fallback = {
    prompt: IDEA_KICKOFF_PROMPT,
    schema: normalizeIdeaCollectorSchema(IDEA_COLLECTOR_FALLBACK_SCHEMA, null),
    template: "",
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
const loadWorkspaceFile = async (params: {
  readonly sessionId: string;
  readonly path: string;
}): Promise<WorkspaceFileResponse | null> => {
  const httpUrl = resolveCoreHttpUrl();
  try {
    const response = await fetch(joinUrl(httpUrl, WORKSPACE_FILE_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: params.sessionId,
        path: params.path,
        maxBytes: 300_000,
      }),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    return isWorkspaceFileResponse(payload) ? payload : null;
  } catch {
    return null;
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
  const runSlug = typeof payload.runSlug === "string" ? payload.runSlug : null;
  return { id, workspacePath, initiativeSlug, stage, runSlug };
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
}): Promise<SessionCreatedPayload> =>
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
      resolve(payload);
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
    const session = await createIdeaCollectorSession({
      workspacePath: params.workspacePath,
      initiativeSlug,
      stage,
      providerId: params.providerId,
    });
    const resolvedInitiativeSlug = session.initiativeSlug ?? initiativeSlug;
    if (!session.runSlug || !resolvedInitiativeSlug) {
      notifyMissingIdeaContext(session.id);
      throw new Error("Workflow run context unavailable.");
    }

    const contract = await loadWorkflowContract(stage);
    const questionnaire = await loadWorkspaceFile({
      sessionId: session.id,
      path: params.questionnairePath,
    });
    const promptPack = buildWorkflowPromptPack({
      stage,
      workspacePath: params.workspacePath,
      workspaceSlug: resolvedInitiativeSlug,
      runSlug: session.runSlug,
      prompt: contract.prompt,
      template: contract.template,
      questionnairePath: params.questionnairePath,
      questionnaireContent: questionnaire?.content ?? "",
      questionnaireTruncated: questionnaire?.truncated ?? false,
      questionnaireMaxBytes: questionnaire?.maxBytes ?? 0,
    });

    api.sendSessionMessage(session.id, promptPack.content);

    return session.id;
  }
}
