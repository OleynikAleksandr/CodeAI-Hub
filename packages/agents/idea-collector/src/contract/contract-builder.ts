import {
  computeVersionHash,
  injectTemplateIntoSchema,
  normalizeSchema,
  readFileMtime,
  readJsonFromFile,
  readTextFromFile,
} from "@codeai-hub/agent-shared";
import type { IdeaContractPayload } from "./contract-types";

/**
 * Template paths for Idea Collector assets.
 * Files are installed to ~/.codeai-hub/templates/ by the extension.
 */
const FLOW_NAME = "full-development-flow";
const IDEA_STAGE = "idea";
const IDEA_TEMPLATE_ROOT = `~/.codeai-hub/templates/${FLOW_NAME}/${IDEA_STAGE}`;

const IDEA_COLLECTOR_PROMPT_PATH = `${IDEA_TEMPLATE_ROOT}/idea-collector-prompt.md`;
const IDEA_COLLECTOR_SCHEMA_PATH = `${IDEA_TEMPLATE_ROOT}/idea-collector-schema.json`;
const IDEA_COLLECTOR_TEMPLATE_PATH = `${IDEA_TEMPLATE_ROOT}/idea-template.md`;
const IDEA_QUESTIONNAIRE_TEMPLATE_PATH = `${IDEA_TEMPLATE_ROOT}/questionnaire-template.md`;

/**
 * Output paths for Idea Collector artifacts.
 * Relative to workspace root.
 */
const DEFAULT_INITIATIVE_SLUG = "full-development-flow";
const IDEA_OUTPUT_PATH = `.codeai-hub/${FLOW_NAME}/initiatives/${DEFAULT_INITIATIVE_SLUG}/${IDEA_STAGE}/idea.md`;
const VIRTUAL_SIMULATION_OUTPUT_PATH = `.codeai-hub/${FLOW_NAME}/initiatives/${DEFAULT_INITIATIVE_SLUG}/${IDEA_STAGE}/virtual-simulation.md`;

/**
 * Path to idea_markdown field in schema for template injection.
 */
const IDEA_MARKDOWN_SCHEMA_PATH = ["artifact", "idea_markdown"];

/**
 * Build the complete contract payload for Idea Collector agent.
 * Reads all template files, normalizes schema, and computes version hash.
 *
 * @returns Contract payload or null if required files are missing
 */
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
      readFileMtime(IDEA_COLLECTOR_PROMPT_PATH),
      readFileMtime(IDEA_COLLECTOR_TEMPLATE_PATH),
      readFileMtime(IDEA_COLLECTOR_SCHEMA_PATH),
      readFileMtime(IDEA_QUESTIONNAIRE_TEMPLATE_PATH),
    ]);

    if (!(prompt && template && schema)) {
      return null;
    }

    const normalizedSchema = normalizeSchema(schema);
    const schemaWithTemplate = injectTemplateIntoSchema(
      normalizedSchema,
      IDEA_MARKDOWN_SCHEMA_PATH,
      template
    );

    const questionnaireTemplateMarkdown = questionnaireTemplate ?? "";
    const outputPaths = {
      idea: IDEA_OUTPUT_PATH,
      virtualSimulation: VIRTUAL_SIMULATION_OUTPUT_PATH,
    };

    const versionSeed = {
      prompt,
      template,
      schema: schemaWithTemplate,
      questionnaireTemplate: questionnaireTemplateMarkdown,
      outputPaths,
      promptMtime,
      templateMtime,
      schemaMtime,
      questionnaireTemplateMtime,
    };

    const version = computeVersionHash(versionSeed);

    return {
      prompt,
      schema: schemaWithTemplate,
      template,
      questionnaire: {
        templateMarkdown: questionnaireTemplateMarkdown,
      },
      outputPaths,
      version,
    };
  };
