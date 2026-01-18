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
  readonly questionnaire?: {
    readonly templateMarkdown: string;
  };
  readonly version: string;
};

type WorkflowContractPaths = {
  readonly prompt: string;
  readonly schema?: string;
  readonly template: string;
  readonly questionnaire?: string;
};

const TEMPLATE_ROOT_SEGMENTS = [".codeai-hub", "templates"];

const DESCRIPTION_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: "description/description-collector-prompt.md",
  template: "description/description-template.md",
  questionnaire: "description/questionnaire-template.md",
};

const VIRTUAL_SIMULATION_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: "virtual_simulation/virtual-simulation-prompt.md",
  template: "virtual_simulation/virtual-simulation-template.md",
};

const DIAGRAM_MODULES_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: "diagram_modules/modules-diagram-prompt.md",
  template: "diagram_modules/modules-diagram-template.mmd",
};

const DIAGRAM_FACADES_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: "diagram_facades/facades-graph-prompt.md",
  template: "diagram_facades/facades-graph-template.mmd",
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

const buildWorkflowContract = async (
  paths: WorkflowContractPaths
): Promise<WorkflowContractPayload | null> => {
  const resolved = {
    prompt: resolveTemplatePath(paths.prompt),
    schema: paths.schema ? resolveTemplatePath(paths.schema) : null,
    template: resolveTemplatePath(paths.template),
    questionnaire: paths.questionnaire
      ? resolveTemplatePath(paths.questionnaire)
      : null,
  };

  if (!(resolved.prompt && resolved.template)) {
    return null;
  }

  const [prompt, schema, template, questionnaireTemplate] = await Promise.all([
    readTextFile(resolved.prompt),
    resolved.schema ? readJsonFile(resolved.schema) : Promise.resolve({}),
    readTextFile(resolved.template),
    resolved.questionnaire ? readTextFile(resolved.questionnaire) : null,
  ]);

  if (!(prompt && template)) {
    return null;
  }
  const resolvedSchema = schema ?? {};

  const questionnaireMarkdown = questionnaireTemplate ?? "";
  const versionSeed = JSON.stringify({
    prompt,
    schema: resolvedSchema,
    template,
    questionnaire: questionnaireMarkdown,
  });
  const version = createHash("sha256").update(versionSeed).digest("hex");

  return {
    prompt,
    schema: resolvedSchema,
    template,
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
