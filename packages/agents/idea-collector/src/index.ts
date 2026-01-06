/**
 * @codeai-hub/idea-collector
 *
 * Idea Collector agent package.
 * Provides contract building, structured output parsing,
 * and artifact path resolution for the Idea stage.
 */

/**
 * Package version constant.
 */
export const IDEA_COLLECTOR_VERSION = "1.1.387";

// Re-export shared types for convenience
export type {
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
} from "@codeai-hub/agent-shared";
