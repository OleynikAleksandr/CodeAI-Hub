import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export type IdeaContractPayload = {
  readonly prompt: string;
  readonly schema: JsonRecord;
  readonly template: string;
  readonly questionnaire: {
    readonly templateMarkdown: string;
  };
  readonly outputPaths: {
    readonly idea: string;
    readonly virtualSimulation: string;
  };
  readonly version: string;
};

const FLOW_NAME = "full-development-flow";
const IDEA_STAGE = "idea";
const DEFAULT_INITIATIVE_SLUG = "full-development-flow";
const IDEA_TEMPLATE_ROOT = `~/.codeai-hub/templates/${FLOW_NAME}/${IDEA_STAGE}`;
const IDEA_COLLECTOR_PROMPT_PATH = `${IDEA_TEMPLATE_ROOT}/idea-collector-prompt.md`;
const IDEA_COLLECTOR_TEMPLATE_PATH = `${IDEA_TEMPLATE_ROOT}/idea-template.md`;
const IDEA_COLLECTOR_SCHEMA_PATH = `${IDEA_TEMPLATE_ROOT}/idea-collector-schema.json`;
const IDEA_QUESTIONNAIRE_TEMPLATE_PATH = `${IDEA_TEMPLATE_ROOT}/questionnaire-template.md`;
const IDEA_COLLECTOR_OUTPUT_PATH = `.codeai-hub/${FLOW_NAME}/initiatives/${DEFAULT_INITIATIVE_SLUG}/${IDEA_STAGE}/idea.md`;
const IDEA_COLLECTOR_VIRTUAL_SIMULATION_PATH = `.codeai-hub/${FLOW_NAME}/initiatives/${DEFAULT_INITIATIVE_SLUG}/${IDEA_STAGE}/virtual-simulation.md`;

export const buildIdeaContract =
  async (): Promise<IdeaContractPayload | null> => {
    const [
      prompt,
      template,
      schema,
      questionnaireTemplate,
      promptMtime,
      templateMtime,
      schemaMtime,
      questionnaireTemplateMtime,
    ] = await Promise.all([
      readTextFromFile(IDEA_COLLECTOR_PROMPT_PATH),
      readTextFromFile(IDEA_COLLECTOR_TEMPLATE_PATH),
      readJsonFromFile(IDEA_COLLECTOR_SCHEMA_PATH),
      readTextFromFile(IDEA_QUESTIONNAIRE_TEMPLATE_PATH),
      readTemplateMtime(IDEA_COLLECTOR_PROMPT_PATH),
      readTemplateMtime(IDEA_COLLECTOR_TEMPLATE_PATH),
      readTemplateMtime(IDEA_COLLECTOR_SCHEMA_PATH),
      readTemplateMtime(IDEA_QUESTIONNAIRE_TEMPLATE_PATH),
    ]);
    if (!(prompt && template && schema)) {
      return null;
    }
    const normalizedSchema = normalizeIdeaCollectorSchema(schema, template);
    const questionnaireTemplateMarkdown = questionnaireTemplate ?? "";
    const versionSeed = JSON.stringify({
      prompt,
      template,
      schema: normalizedSchema,
      questionnaireTemplate: questionnaireTemplateMarkdown,
      outputPaths: {
        idea: IDEA_COLLECTOR_OUTPUT_PATH,
        virtualSimulation: IDEA_COLLECTOR_VIRTUAL_SIMULATION_PATH,
      },
      promptMtime,
      templateMtime,
      schemaMtime,
      questionnaireTemplateMtime,
    });
    const version = createHash("sha256").update(versionSeed).digest("hex");
    return {
      prompt,
      schema: normalizedSchema,
      template,
      questionnaire: {
        templateMarkdown: questionnaireTemplateMarkdown,
      },
      outputPaths: {
        idea: IDEA_COLLECTOR_OUTPUT_PATH,
        virtualSimulation: IDEA_COLLECTOR_VIRTUAL_SIMULATION_PATH,
      },
      version,
    };
  };

const resolveHomeDirectory = (): string | null => {
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (!home || home.length === 0) {
    return null;
  }
  return home;
};

const resolveTemplatePath = (templatePath: string): string | null => {
  if (!templatePath.startsWith("~")) {
    return templatePath;
  }
  const home = resolveHomeDirectory();
  if (!home) {
    return null;
  }
  const trimmed = templatePath.startsWith("~/")
    ? templatePath.slice(2)
    : templatePath.slice(1);
  return path.join(home, trimmed);
};

const readTextFromFile = async (
  templatePath: string
): Promise<string | null> => {
  const resolvedPath = resolveTemplatePath(templatePath);
  if (!resolvedPath) {
    return null;
  }
  try {
    const text = await readFile(resolvedPath, "utf8");
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
};

const readJsonFromFile = async (
  templatePath: string
): Promise<JsonRecord | null> => {
  const raw = await readTextFromFile(templatePath);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readTemplateMtime = async (
  templatePath: string
): Promise<number | null> => {
  const resolvedPath = resolveTemplatePath(templatePath);
  if (!resolvedPath) {
    return null;
  }
  try {
    const stats = await stat(resolvedPath);
    return stats.mtimeMs;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneSchema = (schema: JsonRecord): JsonRecord =>
  JSON.parse(JSON.stringify(schema)) as JsonRecord;

const strictifySchema = (schema: JsonRecord): void => {
  removeCombinators(schema);
  strictifyProperties(schema);
  strictifyItems(schema);
};

const strictifyProperties = (schema: JsonRecord): void => {
  const properties = schema.properties;
  if (!isRecord(properties)) {
    return;
  }
  schema.required = Object.keys(properties);
  if (schema.additionalProperties === undefined) {
    schema.additionalProperties = false;
  }
  for (const value of Object.values(properties)) {
    if (isRecord(value)) {
      strictifySchema(value);
    }
  }
};

const strictifyItems = (schema: JsonRecord): void => {
  const items = schema.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (isRecord(item)) {
        strictifySchema(item);
      }
    }
    return;
  }
  if (isRecord(items)) {
    strictifySchema(items);
  }
};

const removeCombinators = (schema: JsonRecord): void => {
  removeCombinatorsFromProperties(schema);
  removeCombinatorsFromItems(schema);
  for (const key of ["allOf", "anyOf", "oneOf"]) {
    const entries = schema[key];
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      if (isRecord(entry)) {
        removeCombinators(entry);
      }
    }
    delete schema[key];
  }
};

const removeCombinatorsFromProperties = (schema: JsonRecord): void => {
  const properties = schema.properties;
  if (!isRecord(properties)) {
    return;
  }
  for (const value of Object.values(properties)) {
    if (isRecord(value)) {
      removeCombinators(value);
    }
  }
};

const removeCombinatorsFromItems = (schema: JsonRecord): void => {
  const items = schema.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (isRecord(item)) {
        removeCombinators(item);
      }
    }
    return;
  }
  if (isRecord(items)) {
    removeCombinators(items);
  }
};

const sanitizeSchemaKeywords = (schema: JsonRecord): void => {
  pruneSchemaKeys(schema);
  sanitizeSchemaProperties(schema);
  sanitizeSchemaItems(schema);
};

const sanitizeSchemaProperties = (schema: JsonRecord): void => {
  const properties = schema.properties;
  if (!isRecord(properties)) {
    return;
  }
  for (const value of Object.values(properties)) {
    if (isRecord(value)) {
      sanitizeSchemaKeywords(value);
    }
  }
};

const sanitizeSchemaItems = (schema: JsonRecord): void => {
  const items = schema.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (isRecord(item)) {
        sanitizeSchemaKeywords(item);
      }
    }
    return;
  }
  if (isRecord(items)) {
    sanitizeSchemaKeywords(items);
  }
};

const ALLOWED_SCHEMA_KEYS = new Set([
  "type",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "description",
]);

const pruneSchemaKeys = (schema: JsonRecord): void => {
  for (const key of Object.keys(schema)) {
    if (!ALLOWED_SCHEMA_KEYS.has(key)) {
      delete schema[key];
    }
  }
};

const injectTemplateIntoSchema = (
  schema: JsonRecord,
  template: string
): JsonRecord => {
  const properties = schema.properties;
  if (!isRecord(properties)) {
    return schema;
  }
  const artifact = properties.artifact;
  if (!isRecord(artifact)) {
    return schema;
  }
  const artifactProperties = artifact.properties;
  if (!isRecord(artifactProperties)) {
    return schema;
  }
  const ideaMarkdown = artifactProperties.idea_markdown;
  if (!isRecord(ideaMarkdown)) {
    return schema;
  }
  const description =
    typeof ideaMarkdown.description === "string"
      ? ideaMarkdown.description
      : "Idea.md markdown output.";
  ideaMarkdown.description = `${description}\n\nIdea.md template:\n${template}`;
  return schema;
};

const normalizeIdeaCollectorSchema = (
  schema: JsonRecord,
  template: string
): JsonRecord => {
  const next = cloneSchema(schema);
  strictifySchema(next);
  sanitizeSchemaKeywords(next);
  return injectTemplateIntoSchema(next, template);
};
