/**
 * Workflow contract service.
 *
 * Builds contracts for the split workflow steps using the synced templates
 * stored under ~/.codeai-hub/templates/<step>/.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

type WorkflowContractPayload = {
  readonly prompt: string;
  readonly schema: Record<string, unknown>;
  readonly template: string;
  readonly paths: {
    readonly prompt: string;
    readonly template?: string;
    readonly questionnaire?: string;
  };
  readonly questionnaire?: {
    readonly templateMarkdown: string;
  };
  readonly version: string;
};

type WorkflowContractPathSource = string | readonly string[];

type WorkflowContractPaths = {
  readonly prompt: WorkflowContractPathSource;
  readonly schema?: WorkflowContractPathSource;
  readonly template?: WorkflowContractPathSource;
  readonly questionnaire?: WorkflowContractPathSource;
};

type ResolvedWorkflowContractPaths = {
  readonly prompt: readonly string[];
  readonly schema: readonly string[];
  readonly template: readonly string[];
  readonly questionnaire: readonly string[];
};

const TEMPLATE_ROOT_SEGMENTS = [".codeai-hub", "templates"];
const AGENT_ROOT_PATH = path.resolve(__dirname, "../../../../agents");

const DESCRIPTION_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: "description/description-collector-prompt.md",
  template: "description/description-template.md",
  questionnaire: "description/questionnaire-template.md",
};

const VIRTUAL_SIMULATION_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: "virtual_simulation/virtual-simulation-prompt.md",
};

const resolveAgentAssetPath = (
  agentName: string,
  assetFileName: string
): string => path.join(AGENT_ROOT_PATH, agentName, "assets", assetFileName);

const DIAGRAM_MODULES_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: [
    resolveAgentAssetPath("diagram-modules-agent", "module-map-prompt.md"),
    "diagram_modules/modules-diagram-prompt.md",
  ],
  template: [
    resolveAgentAssetPath("diagram-modules-agent", "module-map-template.md"),
    "diagram_modules/modules-diagram-template.mmd",
  ],
};

const DIAGRAM_FACADES_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: [
    resolveAgentAssetPath("diagram-facades-agent", "facade-map-prompt.md"),
    "diagram_facades/facades-graph-prompt.md",
  ],
  template: [
    resolveAgentAssetPath("diagram-facades-agent", "facade-map-template.md"),
    "diagram_facades/facades-graph-template.mmd",
  ],
};

const readTextFile = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const readJsonFile = async (
  filePath: string
): Promise<Record<string, unknown> | null> => {
  const content = await readTextFile(filePath);
  if (!content) {
    return null;
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

const resolveTemplatePath = (relativePath: string): string | null => {
  const home = homedir();
  if (!home) {
    return null;
  }
  return path.join(home, ...TEMPLATE_ROOT_SEGMENTS, relativePath);
};

const resolveWorkflowContractPathCandidates = (
  value: WorkflowContractPathSource | undefined
): readonly string[] => {
  if (!value) {
    return [];
  }
  const candidates = Array.isArray(value) ? value : [value];
  return candidates
    .map((candidate) =>
      path.isAbsolute(candidate) ? candidate : resolveTemplatePath(candidate)
    )
    .filter((candidate): candidate is string => Boolean(candidate));
};

const resolveWorkflowContractPaths = (
  paths: WorkflowContractPaths
): ResolvedWorkflowContractPaths => ({
  prompt: resolveWorkflowContractPathCandidates(paths.prompt),
  schema: resolveWorkflowContractPathCandidates(paths.schema),
  template: resolveWorkflowContractPathCandidates(paths.template),
  questionnaire: resolveWorkflowContractPathCandidates(paths.questionnaire),
});

const readFirstAvailableTextFile = async (
  filePaths: readonly string[]
): Promise<{
  readonly path: string | null;
  readonly content: string | null;
}> => {
  for (const filePath of filePaths) {
    const content = await readTextFile(filePath);
    if (content) {
      return { path: filePath, content };
    }
  }
  return { path: null, content: null };
};

const readFirstAvailableJsonFile = async (
  filePaths: readonly string[]
): Promise<{
  readonly path: string | null;
  readonly content: Record<string, unknown> | null;
}> => {
  for (const filePath of filePaths) {
    const content = await readJsonFile(filePath);
    if (content) {
      return { path: filePath, content };
    }
  }
  return { path: null, content: null };
};

const readWorkflowContractInputs = async (resolved: {
  readonly prompt: readonly string[];
  readonly schema: readonly string[];
  readonly template: readonly string[];
  readonly questionnaire: readonly string[];
}): Promise<{
  readonly promptPath: string | null;
  readonly prompt: string | null;
  readonly schemaPath: string | null;
  readonly schema: Record<string, unknown> | null;
  readonly templatePath: string | null;
  readonly template: string | null;
  readonly questionnairePath: string | null;
  readonly questionnaireTemplate: string | null;
}> => {
  const [prompt, schema, template, questionnaireTemplate] = await Promise.all([
    readFirstAvailableTextFile(resolved.prompt),
    readFirstAvailableJsonFile(resolved.schema),
    readFirstAvailableTextFile(resolved.template),
    readFirstAvailableTextFile(resolved.questionnaire),
  ]);
  return {
    promptPath: prompt.path,
    prompt: prompt.content,
    schemaPath: schema.path,
    schema: schema.content,
    templatePath: template.path,
    template: template.content,
    questionnairePath: questionnaireTemplate.path,
    questionnaireTemplate: questionnaireTemplate.content,
  };
};

const buildWorkflowContract = async (
  paths: WorkflowContractPaths
): Promise<WorkflowContractPayload | null> => {
  const resolved = resolveWorkflowContractPaths(paths);

  if (resolved.prompt.length === 0) {
    return null;
  }

  const {
    prompt,
    promptPath,
    schema,
    template,
    templatePath,
    questionnairePath,
    questionnaireTemplate,
  } = await readWorkflowContractInputs({
    prompt: resolved.prompt,
    schema: resolved.schema,
    template: resolved.template,
    questionnaire: resolved.questionnaire,
  });

  if (!prompt) {
    return null;
  }
  if (resolved.template.length > 0 && !template) {
    return null;
  }
  const resolvedSchema = schema ?? {};
  const resolvedTemplate = template ?? "";

  const questionnaireMarkdown = questionnaireTemplate ?? "";
  const versionSeed = JSON.stringify({
    prompt,
    schema: resolvedSchema,
    template: resolvedTemplate,
    questionnaire: questionnaireMarkdown,
  });
  const version = createHash("sha256").update(versionSeed).digest("hex");

  return {
    prompt,
    schema: resolvedSchema,
    template: resolvedTemplate,
    paths: {
      prompt: promptPath ?? "",
      template: templatePath ?? undefined,
      questionnaire: questionnairePath ?? undefined,
    },
    questionnaire: paths.questionnaire
      ? { templateMarkdown: questionnaireMarkdown }
      : undefined,
    version,
  };
};

export const buildDescriptionContract =
  async (): Promise<WorkflowContractPayload | null> =>
    buildWorkflowContract(DESCRIPTION_TEMPLATE_PATHS);

export const buildVirtualSimulationContract =
  async (): Promise<WorkflowContractPayload | null> =>
    buildWorkflowContract(VIRTUAL_SIMULATION_TEMPLATE_PATHS);

export const buildDiagramModulesContract =
  async (): Promise<WorkflowContractPayload | null> =>
    buildWorkflowContract(DIAGRAM_MODULES_TEMPLATE_PATHS);

export const buildDiagramFacadesContract =
  async (): Promise<WorkflowContractPayload | null> =>
    buildWorkflowContract(DIAGRAM_FACADES_TEMPLATE_PATHS);

export const buildIdeaContract =
  async (): Promise<WorkflowContractPayload | null> =>
    buildDescriptionContract();
