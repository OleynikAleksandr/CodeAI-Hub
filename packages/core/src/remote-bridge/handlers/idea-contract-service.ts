/**
 * Workflow contract service.
 *
 * Builds contracts for the split workflow steps using the synced templates
 * stored under ~/.codeai-hub/templates/<step>/.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { BUNDLED_TEMPLATE_SOURCES } from "../../templates/bundled-templates";
import {
  appendDiagramPromptAppendix,
  DIAGRAM_FACADES_PROMPT_APPENDIX_PATHS,
  DIAGRAM_MODULES_PROMPT_APPENDIX_PATHS,
  resolveSyncedDiagramTemplateCandidates,
} from "./diagram-contract-prompt-assets";

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
  readonly promptAppendix?: WorkflowContractPathSource;
};

type ResolvedWorkflowContractPaths = {
  readonly prompt: readonly string[];
  readonly schema: readonly string[];
  readonly template: readonly string[];
  readonly questionnaire: readonly string[];
  readonly promptAppendix: readonly string[];
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
  prompt: resolveSyncedDiagramTemplateCandidates(
    "diagram_modules/module-inventory-prompt.md",
    "diagram-modules-agent",
    "module-inventory-prompt.md"
  ),
  template: resolveSyncedDiagramTemplateCandidates(
    "diagram_modules/module-inventory-template.md",
    "diagram-modules-agent",
    "module-inventory-template.md"
  ),
  promptAppendix: DIAGRAM_MODULES_PROMPT_APPENDIX_PATHS,
};

const DIAGRAM_FACADES_TEMPLATE_PATHS: WorkflowContractPaths = {
  prompt: resolveSyncedDiagramTemplateCandidates(
    "diagram_facades/facade-map-prompt.md",
    "diagram-facades-agent",
    "facade-map-prompt.md"
  ),
  template: resolveSyncedDiagramTemplateCandidates(
    "diagram_facades/facade-map-template.md",
    "diagram-facades-agent",
    "facade-map-template.md"
  ),
  promptAppendix: DIAGRAM_FACADES_PROMPT_APPENDIX_PATHS,
};

const readTextFile = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const normalizeTemplatePath = (value: string): string =>
  value.replace(/\\/g, "/");

const decodeBundledTemplate = (base64: string): string | null => {
  const raw = base64.trim();
  if (!raw) {
    return null;
  }
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return null;
  }
};

const resolveBundledTemplateSourceForPath = (
  filePath: string
): (typeof BUNDLED_TEMPLATE_SOURCES)[number] | null => {
  const home = homedir();
  if (!home) {
    return null;
  }
  const normalizedHome = normalizeTemplatePath(home);
  const normalizedFilePath = normalizeTemplatePath(filePath);
  const homePrefix = `${normalizedHome}/`;
  if (!normalizedFilePath.startsWith(homePrefix)) {
    return null;
  }
  const relativePath = normalizedFilePath.slice(homePrefix.length);
  return (
    BUNDLED_TEMPLATE_SOURCES.find(
      (entry) =>
        normalizeTemplatePath(entry.destinationRelativePath) === relativePath
    ) ?? null
  );
};

const restoreBundledTemplateToDisk = async (
  filePath: string
): Promise<string | null> => {
  const bundledSource = resolveBundledTemplateSourceForPath(filePath);
  if (!bundledSource) {
    return null;
  }
  const decoded = decodeBundledTemplate(bundledSource.base64);
  if (!decoded) {
    return null;
  }
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${decoded.trimEnd()}\n`, "utf8");
    return decoded;
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
  promptAppendix: resolveWorkflowContractPathCandidates(paths.promptAppendix),
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
  for (const filePath of filePaths) {
    const restoredContent = await restoreBundledTemplateToDisk(filePath);
    if (restoredContent) {
      return { path: filePath, content: restoredContent };
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
  readonly promptAppendix: readonly string[];
}): Promise<{
  readonly promptPath: string | null;
  readonly prompt: string | null;
  readonly schemaPath: string | null;
  readonly schema: Record<string, unknown> | null;
  readonly templatePath: string | null;
  readonly template: string | null;
  readonly questionnairePath: string | null;
  readonly questionnaireTemplate: string | null;
  readonly promptAppendix: readonly string[];
}> => {
  const [prompt, schema, template, questionnaireTemplate, promptAppendix] =
    await Promise.all([
      readFirstAvailableTextFile(resolved.prompt),
      readFirstAvailableJsonFile(resolved.schema),
      readFirstAvailableTextFile(resolved.template),
      readFirstAvailableTextFile(resolved.questionnaire),
      Promise.all(
        resolved.promptAppendix.map((filePath) => readTextFile(filePath))
      ),
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
    promptAppendix: promptAppendix.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0
    ),
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
    promptAppendix,
  } = await readWorkflowContractInputs({
    prompt: resolved.prompt,
    schema: resolved.schema,
    template: resolved.template,
    questionnaire: resolved.questionnaire,
    promptAppendix: resolved.promptAppendix,
  });

  if (!prompt) {
    return null;
  }
  if (resolved.template.length > 0 && !template) {
    return null;
  }
  const resolvedSchema = schema ?? {};
  const resolvedTemplate = template ?? "";
  const resolvedPrompt = appendDiagramPromptAppendix(prompt, promptAppendix);

  const questionnaireMarkdown = questionnaireTemplate ?? "";
  const versionSeed = JSON.stringify({
    prompt: resolvedPrompt,
    schema: resolvedSchema,
    template: resolvedTemplate,
    questionnaire: questionnaireMarkdown,
  });
  const version = createHash("sha256").update(versionSeed).digest("hex");

  return {
    prompt: resolvedPrompt,
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

// Legacy endpoint alias for disabled Idea flows. The canonical first workflow step
// is Description, and this alias is no longer backed by a separate idea-collector package.
export const buildIdeaContract = buildDescriptionContract;
