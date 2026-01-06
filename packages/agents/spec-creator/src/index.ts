/**
 * @codeai-hub/spec-creator
 *
 * Spec Creator agent package.
 * Provides contract building, structured output parsing,
 * and artifact path resolution for the Specification stage.
 *
 * Usage:
 * ```typescript
 * import { SpecCreatorFacade } from '@codeai-hub/spec-creator';
 *
 * // Build contract for LLM
 * const contract = await SpecCreatorFacade.buildContract();
 *
 * // Parse LLM response
 * const output = SpecCreatorFacade.parseStructuredOutput(responseText);
 *
 * // Get artifact paths
 * const paths = SpecCreatorFacade.getArtifactPaths('my-initiative');
 * ```
 */

/**
 * Package version constant.
 */
export const SPEC_CREATOR_VERSION = "1.1.387";

// Re-export shared types for convenience
export type {
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
} from "@codeai-hub/agent-shared";

// Contract types
export type {
  SpecContractPayload,
  SpecOutputPaths,
} from "./contract";

// Facade - primary entry point
export { SpecCreatorFacade } from "./facade";

// Parser types
export type {
  SpecArtifact,
  SpecParseResult,
  SpecStructuredOutput,
} from "./parser";

// Paths types and constants
export type { SpecArtifactPaths } from "./paths";
export {
  DEFAULT_INITIATIVE_SLUG,
  FLOW_NAME,
  SPEC_OUTPUT_PATHS,
  SPEC_STAGE,
  SPEC_TEMPLATE_PATHS,
} from "./paths";
