/**
 * @codeai-hub/description-agent
 *
 * Description Agent package.
 * Provides contract building, structured output parsing,
 * and artifact path resolution for the Description stage.
 *
 * Usage:
 * ```typescript
 * import { DescriptionAgentFacade } from '@codeai-hub/description-agent';
 *
 * // Build contract for LLM
 * const contract = await DescriptionAgentFacade.buildContract();
 *
 * // Parse LLM response
 * const output = DescriptionAgentFacade.parseStructuredOutput(responseText);
 *
 * // Get artifact paths
 * const paths = DescriptionAgentFacade.getArtifactPaths('my-workspace');
 * ```
 */

/**
 * Package version constant.
 */
export const DESCRIPTION_AGENT_VERSION = "1.1.387";

// Re-export shared types for convenience
export type {
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
} from "@codeai-hub/agent-shared";

// Facade - primary entry point
export { DescriptionAgentFacade } from "./facade";
