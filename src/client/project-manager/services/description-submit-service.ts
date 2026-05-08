import type { ProviderStackId } from "../../../types/provider";
import { api } from "../api";
import { readBrowserLocalizationBootstrapSnapshot } from "../../ui/src/app-host/localization-runtime-contract";
import type { SettingsLoadedPayload } from "../core-stream-message-types";
import { IDEA_COLLECTOR_FALLBACK_SCHEMA } from "../../ui/src/services/idea-collector-fallback-schema";
import { normalizeIdeaCollectorSchema } from "../../ui/src/services/idea-collector-schema-utils";
import { postSystemNotice } from "../../ui/src/services/idea-collector-support";
import { notifyMissingDescriptionContext } from "../../ui/src/services/description-questionnaire-messages";
import {
  isRecord,
  joinUrl,
  resolveCoreHttpUrl,
  resolveWorkspaceName,
  toWorkspaceSlug,
} from "./description-questionnaire-utils";
import {
  buildWorkflowPromptPack,
  resolveWorkflowChatLanguage,
} from "./prompt-pack-builder";
import { waitForSessionProviderBinding } from "./session-binding-waiter";
import {
  buildProductPartSourceArtifactDescriptors,
  buildWorkflowSourceArtifactDescriptors,
  type WorkflowSourceArtifactDescriptor,
} from "./workflow-source-artifact-descriptors";

const SESSION_CREATE_TIMEOUT_MS = 15000;
const DEFAULT_ARTIFACT_LANGUAGE = "en";
const LEGACY_SOURCE_LANGUAGE = "source";
const WORKFLOW_CONTRACT_ENDPOINTS = {
  description: "/api/v1/orchestrator/description-contract",
  virtual_simulation: "/api/v1/orchestrator/virtual-simulation-contract",
  diagram_modules: "/api/v1/orchestrator/diagram-modules-contract",
  application_skeleton: "/api/v1/orchestrator/application-skeleton-contract",
  quality_gates: "/api/v1/orchestrator/quality-gates-contract",
} as const;
const WORKFLOW_FILE_FIRST_FALLBACK_PROMPT =
  "Build the artifact from the questionnaire and template. " +
  "Write the result to the target file path.";
const WORKFLOW_SOURCE_MAX_BYTES = 500_000;
export type WorkflowStageId = keyof typeof WORKFLOW_CONTRACT_ENDPOINTS;

const isRecordValue = (
  value: unknown
): value is Readonly<Record<string, unknown>> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeArtifactLanguage = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return normalized === LEGACY_SOURCE_LANGUAGE
    ? DEFAULT_ARTIFACT_LANGUAGE
    : normalized;
};

const resolveBootstrapArtifactLanguage = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const bootstrapSettings = readBrowserLocalizationBootstrapSnapshot()?.settings;
  const categoriesCandidate: unknown = bootstrapSettings?.categories;
  const categories = isRecordValue(categoriesCandidate)
    ? categoriesCandidate
    : null;

  return (
    normalizeArtifactLanguage(categories?.artifacts_for_the_user) ??
    normalizeArtifactLanguage(categories?.interactive_templates)
  );
};

export const resolveArtifactsForTheUserLanguage = (
  payload: SettingsLoadedPayload | null | undefined
): string => {
  const settings = isRecordValue(payload?.settings) ? payload.settings : null;
  const general = settings && isRecordValue(settings.general) ? settings.general : null;
  const localization =
    general && isRecordValue(general.localization) ? general.localization : null;
  const categories =
    localization && isRecordValue(localization.categories)
      ? localization.categories
      : null;

  return (
    normalizeArtifactLanguage(categories?.artifactsForTheUser) ??
    normalizeArtifactLanguage(categories?.interactiveTemplates) ??
    resolveBootstrapArtifactLanguage() ??
    DEFAULT_ARTIFACT_LANGUAGE
  );
};

export type WorkflowContractSnapshot = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly template: string;
  readonly paths: {
    readonly prompt: string;
    readonly template?: string;
    readonly questionnaire?: string;
  };
};
type SessionCreatedPayload = {
  readonly id: string;
  readonly workspacePath?: string;
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
};
type SessionErrorPayload = {
  readonly sessionId?: string;
  readonly message: string;
};
type WorkflowSourceArtifactPayload = {
  readonly content: string;
  readonly label: string;
  readonly relativePath: string;
  readonly truncated?: boolean;
};

const cachedWorkflowSchemas = new Map<WorkflowStageId, Record<string, unknown>>();
const pendingWorkflowSchemas = new Map<WorkflowStageId, Promise<Record<string, unknown>>>();

const normalizeWorkflowContract = (
  payload: unknown,
  stage: WorkflowStageId
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
  const pathsRaw = isRecord(payload.paths) ? payload.paths : null;
  const promptPath =
    pathsRaw && typeof pathsRaw.prompt === "string" ? pathsRaw.prompt : null;
  const templatePath =
    pathsRaw && typeof pathsRaw.template === "string" ? pathsRaw.template : null;
  const questionnairePath =
    pathsRaw && typeof pathsRaw.questionnaire === "string"
      ? pathsRaw.questionnaire
      : undefined;
  const needsTemplate = stage === "description";
  if (!(prompt && schema && promptPath)) {
    return null;
  }
  if (needsTemplate && !templatePath) {
    return null;
  }
  return {
    prompt,
    schema: normalizeIdeaCollectorSchema(
      schema,
      template.trim().length > 0 ? template : null
    ),
    template,
    paths: {
      prompt: promptPath,
      template: templatePath ?? undefined,
      questionnaire: questionnairePath,
    },
  };
};
export const loadWorkflowContract = async (
  stage: WorkflowStageId
): Promise<WorkflowContractSnapshot> => {
  const httpUrl = resolveCoreHttpUrl();
  const fallback = {
    prompt: WORKFLOW_FILE_FIRST_FALLBACK_PROMPT,
    schema: normalizeIdeaCollectorSchema(IDEA_COLLECTOR_FALLBACK_SCHEMA, null),
    template: "",
    paths: { prompt: "" },
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
    return normalizeWorkflowContract(payload, stage) ?? fallback;
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

const readWorkflowSourceArtifact = async (params: {
  readonly label: string;
  readonly relativePath: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowSourceArtifactPayload | null> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return null;
  }
  const query = new URLSearchParams({
    maxBytes: String(WORKFLOW_SOURCE_MAX_BYTES),
    path: params.relativePath,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  try {
    const response = await fetch(
      joinUrl(httpUrl, `/api/v1/orchestrator/workflow-artifact?${query.toString()}`)
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    if (!isRecord(payload) || typeof payload.content !== "string") {
      return null;
    }
    return {
      content: payload.content,
      label: params.label,
      relativePath: params.relativePath,
      truncated: payload.truncated === true,
    };
  } catch {
    return null;
  }
};

const readWorkflowSourceArtifactList = async (params: {
  readonly descriptors: readonly WorkflowSourceArtifactDescriptor[];
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly WorkflowSourceArtifactPayload[]> => {
  const sourceArtifacts = await Promise.all(
    params.descriptors.map((descriptor) =>
      readWorkflowSourceArtifact({
        ...descriptor,
        workspacePath: params.workspacePath,
        workspaceSlug: params.workspaceSlug,
      })
    )
  );
  return sourceArtifacts.filter(
    (artifact): artifact is WorkflowSourceArtifactPayload => Boolean(artifact)
  );
};

const readWorkflowSourceArtifacts = async (params: {
  readonly stage: WorkflowStageId;
  readonly questionnairePath: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly WorkflowSourceArtifactPayload[]> => {
  const sourceArtifacts = await readWorkflowSourceArtifactList({
    descriptors: buildWorkflowSourceArtifactDescriptors(params),
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  if (params.stage !== "application_skeleton") {
    return sourceArtifacts;
  }
  const productPartsIndex = sourceArtifacts.find(
    (artifact) => artifact.label === "product-parts.index.md"
  );
  if (!productPartsIndex) {
    return sourceArtifacts;
  }
  const productPartArtifacts = await readWorkflowSourceArtifactList({
    descriptors: buildProductPartSourceArtifactDescriptors({
      productPartsIndexContent: productPartsIndex.content,
      workspaceSlug: params.workspaceSlug,
    }),
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  return [...sourceArtifacts, ...productPartArtifacts];
};

const createDescriptionSession = async (params: {
  readonly workspacePath: string;
  readonly initiativeSlug: string;
  readonly stage: WorkflowStageId;
  readonly providerId?: ProviderStackId;
  readonly sessionKind?: "collector" | null;
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
      sessionKind: params.sessionKind,
    });
  });
export class DescriptionSubmitService {
  async submitQuestionnaire(params: {
    readonly workspaceName?: string;
    readonly workspaceSlug?: string;
    readonly workspacePath: string;
    readonly questionnairePath: string;
    readonly stage?: WorkflowStageId;
    readonly artifactLanguage?: string;
    readonly chatLanguage?: string;
    readonly providerId?: ProviderStackId;
    readonly onSessionCreated?: (sessionId: string) => void;
  }): Promise<string> {
    const workspaceName = resolveWorkspaceName({
      name: params.workspaceName,
      path: params.workspacePath,
    });
    const initiativeSlug =
      typeof params.workspaceSlug === "string" && params.workspaceSlug.trim().length > 0
        ? params.workspaceSlug.trim()
        : toWorkspaceSlug(workspaceName);
    const stage = params.stage ?? "description";
    const contractPromise = loadWorkflowContract(stage);
    const session = await createDescriptionSession({
      workspacePath: params.workspacePath,
      initiativeSlug,
      stage,
      providerId: params.providerId,
      sessionKind: stage === "description" ? null : "collector",
    });
    params.onSessionCreated?.(session.id);
    const resolvedInitiativeSlug = session.initiativeSlug ?? initiativeSlug;
    const settingsPayload = api.getLastSettingsPayload();
    const artifactLanguage =
      normalizeArtifactLanguage(params.artifactLanguage) ??
      resolveArtifactsForTheUserLanguage(settingsPayload);
    const chatLanguage =
      params.chatLanguage?.trim() || resolveWorkflowChatLanguage(settingsPayload);
    if (!resolvedInitiativeSlug) {
      notifyMissingDescriptionContext(session.id);
      return session.id;
    }
    const bindingPromise = waitForSessionProviderBinding(session.id);
    try {
      const contract = await contractPromise;
      const sourceArtifacts = await readWorkflowSourceArtifacts({
        stage,
        questionnairePath: params.questionnairePath,
        workspacePath: params.workspacePath,
        workspaceSlug: resolvedInitiativeSlug,
      });
      const promptPack = buildWorkflowPromptPack({
        artifactLanguage,
        chatLanguage,
        sourceArtifacts,
        stage,
        workspacePath: params.workspacePath,
        workspaceSlug: resolvedInitiativeSlug,
        prompt: contract.prompt,
        templatePath: contract.paths.template,
        questionnairePath: params.questionnairePath,
      });
      await bindingPromise;
      api.sendSessionMessage(session.id, promptPack.content);
    } catch (error) {
      postSystemNotice(
        session.id,
        error instanceof Error ? error.message : "Не удалось отправить анкету."
      );
    }
    return session.id;
  }
}
