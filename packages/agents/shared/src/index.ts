/**
 * @codeai-hub/agent-shared
 *
 * Shared utilities and types for CodeAI Hub agent packages.
 * This package provides common functionality used by all agent packages
 * (idea-collector, description-agent, plan-builder, etc.).
 */

/**
 * Package version constant.
 * Used for debugging and version tracking.
 */
export const AGENT_SHARED_VERSION = "1.1.387";

// Contract utilities
export {
  computeVersionHash,
  readFileMtime,
  readJsonFromFile,
  readTextFromFile,
  resolveHomeDirectory,
  resolveTemplatePath,
} from "./contract-utils";
// Schema utilities
export {
  cloneSchema,
  injectTemplateIntoSchema,
  isRecord,
  normalizeSchema,
  strictifySchema,
} from "./schema-utils";

// Types
export type {
  AgentOutputPaths,
  AgentTemplatePaths,
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
  StructuredOutputParseResult,
} from "./types";
