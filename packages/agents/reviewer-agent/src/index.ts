/**
 * @codeai-hub/reviewer-agent
 *
 * Reviewer Agent package.
 * Provides contract building, structured output parsing,
 * and artifact path resolution for reviewer flows.
 *
 * Usage:
 * ```typescript
 * import { ReviewerAgentFacade } from '@codeai-hub/reviewer-agent';
 *
 * // Build contract for LLM
 * const contract = await ReviewerAgentFacade.buildContract();
 *
 * // Parse LLM response
 * const output = ReviewerAgentFacade.parseStructuredOutput(responseText);
 *
 * // Get artifact paths
 * const paths = ReviewerAgentFacade.getArtifactPaths('my-workspace');
 * ```
 */

/**
 * Package version constant.
 */
export const REVIEWER_AGENT_VERSION = "1.1.387";

// Re-export shared types for convenience
export type {
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
} from "@codeai-hub/agent-shared";

// Facade - primary entry point
export { ReviewerAgentFacade } from "./facade";
