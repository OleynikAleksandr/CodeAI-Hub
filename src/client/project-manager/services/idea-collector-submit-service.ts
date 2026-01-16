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

const IDEA_CONTRACT_ENDPOINT = "/api/v1/orchestrator/idea-contract";
const SESSION_CREATE_TIMEOUT_MS = 15000;

type IdeaContractSnapshot = {
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

const activeIdeaSessions = new Set<string>();
let streamListenerReady = false;

const buildPromptWithSlots = (prompt: string): string =>
  `${prompt}\n\n` +
  "Слоты сохранения для этой сессии (используй в Structured Output):\n" +
  "- idea.md: cluster.idea.idea\n" +
  "- virtual-simulation.md: cluster.idea.virtual-simulation";

const normalizeIdeaContract = (
  payload: unknown
): IdeaContractSnapshot | null => {
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

const loadIdeaContract = async (): Promise<IdeaContractSnapshot> => {
  const httpUrl = resolveCoreHttpUrl();
  const fallback = {
    prompt: IDEA_KICKOFF_PROMPT,
    schema: normalizeIdeaCollectorSchema(IDEA_COLLECTOR_FALLBACK_SCHEMA, null),
  };
  if (!httpUrl) {
    return fallback;
  }

  try {
    const response = await fetch(joinUrl(httpUrl, IDEA_CONTRACT_ENDPOINT));
    if (!response.ok) {
      return fallback;
    }
    const payload = (await response.json()) as unknown;
    return normalizeIdeaContract(payload) ?? fallback;
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
    if (!payload?.sessionId || !activeIdeaSessions.has(payload.sessionId)) {
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

const createIdeaCollectorSession = async (params: {
  readonly workspacePath: string;
  readonly initiativeSlug: string;
  readonly stage: string;
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
  }): Promise<void> {
    const workspaceName = resolveWorkspaceName({
      name: params.workspaceName,
      path: params.workspacePath,
    });
    const initiativeSlug = toWorkspaceSlug(workspaceName);
    const sessionId = await createIdeaCollectorSession({
      workspacePath: params.workspacePath,
      initiativeSlug,
      stage: "idea",
    });

    activeIdeaSessions.add(sessionId);
    ensureStreamListener();

    const contract = await loadIdeaContract();
    const submissionMessage = buildQuestionnaireSubmissionMessage(
      params.questionnairePath
    );
    const content = `${buildPromptWithSlots(contract.prompt)}\n\n${submissionMessage}`;

    api.sendSessionMessage(sessionId, content, {
      outputSchema: contract.schema,
    });
  }
}
