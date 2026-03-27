import { IDEA_KICKOFF_PROMPT } from "../app-host/idea-kickoff-prompt";
import { extractIdeaContractQuestionnaireTemplate } from "../core-bridge/normalizers";
import { IDEA_COLLECTOR_FALLBACK_SCHEMA } from "./idea-collector-fallback-schema";
import { normalizeIdeaCollectorSchema } from "./idea-collector-schema-utils";
import { joinUrl, resolveCoreHttpUrl } from "./idea-collector-support";

interface WorkflowContractPayload extends Record<string, unknown> {
  readonly prompt: string;
  readonly questionnaire?: {
    readonly templateMarkdown?: string;
  };
  readonly schema: Record<string, unknown>;
  readonly template?: string;
  readonly version?: string;
}

interface WorkflowContractSnapshot {
  readonly prompt: string;
  readonly questionnaireTemplateMarkdown: string | null;
  readonly schema: Record<string, unknown>;
  readonly template: string | null;
  readonly version: string | null;
}

export type DescriptionContractSnapshot = WorkflowContractSnapshot;
export type VirtualSimulationContractSnapshot = WorkflowContractSnapshot;

export interface IdeaContractSnapshot {
  readonly outputPaths: {
    readonly idea: string;
    readonly virtualSimulation: string;
  };
  readonly prompt: string;
  readonly questionnaireTemplateMarkdown: string | null;
  readonly schema: Record<string, unknown>;
}

const DESCRIPTION_CONTRACT_ENDPOINT =
  "/api/v1/orchestrator/description-contract";
const VIRTUAL_SIMULATION_CONTRACT_ENDPOINT =
  "/api/v1/orchestrator/virtual-simulation-contract";
const FALLBACK_OUTPUT_PATHS = {
  idea: ".codeai-hub/unknown-workspace/description/Final_Description.md",
  virtualSimulation:
    ".codeai-hub/unknown-workspace/virtual_simulation/virtual-simulation.md",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWorkflowContractPayload = (
  value: unknown
): value is WorkflowContractPayload => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.prompt === "string" &&
    value.prompt.length > 0 &&
    isRecord(value.schema)
  );
};

const parseVersion = (payload: WorkflowContractPayload): string | null =>
  typeof payload.version === "string" && payload.version.trim().length > 0
    ? payload.version
    : null;

const fetchWorkflowContract = async (
  endpoint: string
): Promise<WorkflowContractSnapshot | null> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return null;
  }
  try {
    const response = await fetch(joinUrl(httpUrl, endpoint));
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    if (!isWorkflowContractPayload(payload)) {
      return null;
    }
    const template =
      typeof payload.template === "string" && payload.template.length > 0
        ? payload.template
        : null;
    const schema = normalizeIdeaCollectorSchema(payload.schema, template);
    const questionnaireTemplateMarkdown =
      extractIdeaContractQuestionnaireTemplate(payload) ?? null;
    return {
      prompt: payload.prompt,
      schema,
      template,
      questionnaireTemplateMarkdown,
      version: parseVersion(payload),
    };
  } catch {
    return null;
  }
};

const fallbackContract = (): WorkflowContractSnapshot => ({
  prompt: IDEA_KICKOFF_PROMPT,
  schema: normalizeIdeaCollectorSchema(IDEA_COLLECTOR_FALLBACK_SCHEMA, null),
  template: null,
  questionnaireTemplateMarkdown: null,
  version: null,
});

export const loadDescriptionContract =
  async (): Promise<DescriptionContractSnapshot> =>
    (await fetchWorkflowContract(DESCRIPTION_CONTRACT_ENDPOINT)) ??
    fallbackContract();

export const loadVirtualSimulationContract =
  async (): Promise<VirtualSimulationContractSnapshot> =>
    (await fetchWorkflowContract(VIRTUAL_SIMULATION_CONTRACT_ENDPOINT)) ??
    fallbackContract();

const buildLegacyIdeaAliasContract =
  async (): Promise<IdeaContractSnapshot> => {
    const descriptionContract = await loadDescriptionContract();
    return {
      prompt: descriptionContract.prompt,
      schema: descriptionContract.schema,
      outputPaths: FALLBACK_OUTPUT_PATHS,
      questionnaireTemplateMarkdown:
        descriptionContract.questionnaireTemplateMarkdown,
    };
  };

export const loadIdeaContract = async (): Promise<IdeaContractSnapshot> =>
  buildLegacyIdeaAliasContract();
