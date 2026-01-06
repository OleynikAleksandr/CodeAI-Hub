/**
 * @codeai-hub/idea-collector
 *
 * Idea Collector agent package.
 * Provides contract building, structured output parsing,
 * and artifact path resolution for the Idea stage.
 *
 * Usage:
 * ```typescript
 * import { IdeaCollectorFacade } from '@codeai-hub/idea-collector';
 *
 * // Build contract for LLM
 * const contract = await IdeaCollectorFacade.buildContract();
 *
 * // Parse LLM response
 * const output = IdeaCollectorFacade.parseStructuredOutput(responseText);
 *
 * // Get artifact paths
 * const paths = IdeaCollectorFacade.getArtifactPaths('my-initiative');
 * ```
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

// Contract types
export type {
  IdeaContractPayload,
  IdeaOutputPaths,
  IdeaQuestionnaireConfig,
} from "./contract";
// Facade - primary entry point
export { IdeaCollectorFacade } from "./facade";
// Parser types
export type {
  IdeaArtifact,
  IdeaParseResult,
  IdeaStructuredOutput,
} from "./parser";
// Paths types and constants
export type { IdeaArtifactPaths } from "./paths";
export {
  DEFAULT_INITIATIVE_SLUG,
  FLOW_NAME,
  IDEA_OUTPUT_PATHS,
  IDEA_STAGE,
  IDEA_TEMPLATE_PATHS,
} from "./paths";
