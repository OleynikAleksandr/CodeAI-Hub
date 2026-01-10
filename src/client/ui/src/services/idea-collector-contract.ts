import { IDEA_KICKOFF_PROMPT } from "../app-host/idea-kickoff-prompt";
import { extractIdeaContractQuestionnaireTemplate } from "../core-bridge/normalizers";
import { IDEA_COLLECTOR_FALLBACK_SCHEMA } from "./idea-collector-fallback-schema";
import { normalizeIdeaCollectorSchema } from "./idea-collector-schema-utils";
import { joinUrl, resolveCoreHttpUrl } from "./idea-collector-support";

type IdeaContractPayload = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly questionnaire?: {
    readonly templateMarkdown?: string;
  };
  readonly outputPaths: {
    readonly idea: string;
    readonly virtualSimulation: string;
  };
};

export type IdeaContractSnapshot = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly outputPaths: {
    readonly idea: string;
    readonly virtualSimulation: string;
  };
  readonly questionnaireTemplateMarkdown: string | null;
};

const IDEA_CONTRACT_ENDPOINT = "/api/v1/orchestrator/idea-contract";
const FALLBACK_OUTPUT_PATHS = {
  idea: ".codeai-hub/initiatives/unknown-initiative/runs/000-unknown/idea/idea.md",
  virtualSimulation:
    ".codeai-hub/initiatives/unknown-initiative/runs/000-unknown/idea/virtual-simulation.md",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIdeaContractPayload = (
  value: unknown
): value is IdeaContractPayload => {
  if (!isRecord(value)) {
    return false;
  }
  const outputPaths = value.outputPaths;
  return (
    typeof value.prompt === "string" &&
    value.prompt.length > 0 &&
    isRecord(value.schema) &&
    isRecord(outputPaths) &&
    typeof outputPaths.idea === "string" &&
    outputPaths.idea.length > 0 &&
    typeof outputPaths.virtualSimulation === "string" &&
    outputPaths.virtualSimulation.length > 0
  );
};

const fetchIdeaContract = async (): Promise<IdeaContractSnapshot | null> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return null;
  }
  try {
    const response = await fetch(joinUrl(httpUrl, IDEA_CONTRACT_ENDPOINT));
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    if (!isIdeaContractPayload(payload)) {
      return null;
    }
    const schema = normalizeIdeaCollectorSchema(payload.schema, null);
    const questionnaireTemplateMarkdown =
      extractIdeaContractQuestionnaireTemplate(payload) ?? null;
    return {
      prompt: payload.prompt,
      schema,
      outputPaths: payload.outputPaths,
      questionnaireTemplateMarkdown,
    };
  } catch {
    return null;
  }
};

export const loadIdeaContract = async (): Promise<IdeaContractSnapshot> => {
  const remote = await fetchIdeaContract();
  if (remote) {
    return remote;
  }
  const fallbackSchema = normalizeIdeaCollectorSchema(
    IDEA_COLLECTOR_FALLBACK_SCHEMA,
    null
  );
  return {
    prompt: IDEA_KICKOFF_PROMPT,
    schema: fallbackSchema,
    outputPaths: FALLBACK_OUTPUT_PATHS,
    questionnaireTemplateMarkdown: null,
  };
};
