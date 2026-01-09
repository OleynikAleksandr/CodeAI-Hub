import {
  computeVersionHash,
  injectTemplateIntoSchema,
  normalizeSchema,
  readFileMtime,
  readJsonFromFile,
  readTextFromFile,
} from "@codeai-hub/agent-shared";
import {
  getIdeaOutputPaths,
  IDEA_MARKDOWN_SCHEMA_PATH,
  IDEA_TEMPLATE_PATHS,
} from "../paths";
import type { IdeaContractPayload } from "./contract-types";

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
      readTextFromFile(IDEA_TEMPLATE_PATHS.prompt),
      readTextFromFile(IDEA_TEMPLATE_PATHS.template),
      readJsonFromFile(IDEA_TEMPLATE_PATHS.schema),
      readTextFromFile(IDEA_TEMPLATE_PATHS.questionnaire),
      readFileMtime(IDEA_TEMPLATE_PATHS.prompt),
      readFileMtime(IDEA_TEMPLATE_PATHS.template),
      readFileMtime(IDEA_TEMPLATE_PATHS.schema),
      readFileMtime(IDEA_TEMPLATE_PATHS.questionnaire),
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
    const outputPaths = getIdeaOutputPaths();

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
