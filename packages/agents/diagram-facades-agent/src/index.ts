/**
 * @codeai-hub/diagram-facades-agent
 *
 * Diagram Facades Agent package.
 * Provides contract building, structured output parsing,
 * and artifact path resolution for the Facades Diagram stage.
 *
 * Usage:
 * ```typescript
 * import { DiagramFacadesAgentFacade } from '@codeai-hub/diagram-facades-agent';
 *
 * // Build contract for LLM
 * const contract = await DiagramFacadesAgentFacade.buildContract();
 *
 * // Parse LLM response
 * const output = DiagramFacadesAgentFacade.parseStructuredOutput(responseText);
 *
 * // Get artifact paths
 * const paths = DiagramFacadesAgentFacade.getArtifactPaths('my-workspace');
 * ```
 */

/**
 * Package version constant.
 */
export const DIAGRAM_FACADES_AGENT_VERSION = "1.1.387";

// Re-export shared types for convenience
export type {
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
} from "@codeai-hub/agent-shared";

// Facade - primary entry point
export { DiagramFacadesAgentFacade } from "./facade";
