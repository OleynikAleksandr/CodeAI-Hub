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

type WorkflowContractPaths = {
  readonly prompt: string;
  readonly schema?: string;
  readonly template?: string;
  readonly questionnaire?: string;
};

type ResolvedWorkflowContractPaths = {
  readonly prompt: string | null;
  readonly schema: string | null;
  readonly template: string | null;
  readonly questionnaire: string | null;
};

const TEMPLATE_ROOT_SEGMENTS = [".codeai-hub", "templates"];

const DESCRIPTION_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: "description/description-collector-prompt.md",
  template: "description/description-template.md",
  questionnaire: "description/questionnaire-template.md",
};

const VIRTUAL_SIMULATION_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: "virtual_simulation/virtual-simulation-prompt.md",
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

const resolveWorkflowContractPaths = (
  paths: WorkflowContractPaths
): ResolvedWorkflowContractPaths => ({
  prompt: resolveTemplatePath(paths.prompt),
  schema: paths.schema ? resolveTemplatePath(paths.schema) : null,
  template: paths.template ? resolveTemplatePath(paths.template) : null,
  questionnaire: paths.questionnaire
    ? resolveTemplatePath(paths.questionnaire)
    : null,
});

const readWorkflowContractInputs = async (resolved: {
  readonly prompt: string;
  readonly schema: string | null;
  readonly template: string | null;
  readonly questionnaire: string | null;
}): Promise<{
  readonly prompt: string | null;
  readonly schema: Record<string, unknown> | null;
  readonly template: string | null;
  readonly questionnaireTemplate: string | null;
}> => {
  const [prompt, schema, template, questionnaireTemplate] = await Promise.all([
    readTextFile(resolved.prompt),
    resolved.schema ? readJsonFile(resolved.schema) : Promise.resolve({}),
    resolved.template ? readTextFile(resolved.template) : Promise.resolve(""),
    resolved.questionnaire ? readTextFile(resolved.questionnaire) : null,
  ]);
  return { prompt, schema, template, questionnaireTemplate };
};

const buildWorkflowContract = async (
  paths: WorkflowContractPaths
): Promise<WorkflowContractPayload | null> => {
  const resolved = resolveWorkflowContractPaths(paths);

  if (!resolved.prompt) {
    return null;
  }

  const { prompt, schema, template, questionnaireTemplate } =
    await readWorkflowContractInputs({
      prompt: resolved.prompt,
      schema: resolved.schema,
      template: resolved.template,
      questionnaire: resolved.questionnaire,
    });

  if (!prompt) {
    return null;
  }
  if (resolved.template && !template) {
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
      prompt: resolved.prompt,
      template: resolved.template ?? undefined,
      questionnaire: resolved.questionnaire ?? undefined,
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
