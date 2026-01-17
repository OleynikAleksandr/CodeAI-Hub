/**
 * @codeai-hub/diagram-modules-agent
 *
 * Diagram Modules Agent package.
 * Provides contract building, structured output parsing,
 * and artifact path resolution for the Module Diagram stage.
 *
 * Usage:
 * ```typescript
 * import { DiagramModulesAgentFacade } from '@codeai-hub/diagram-modules-agent';
 *
 * // Build contract for LLM
 * const contract = await DiagramModulesAgentFacade.buildContract();
 *
 * // Parse LLM response
 * const output = DiagramModulesAgentFacade.parseStructuredOutput(responseText);
 *
 * // Get artifact paths
 * const paths = DiagramModulesAgentFacade.getArtifactPaths('my-workspace');
 * ```
 */

/**
 * Package version constant.
 */
export const DIAGRAM_MODULES_AGENT_VERSION = "1.1.387";

// Re-export shared types for convenience
export type {
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
} from "@codeai-hub/agent-shared";

// Facade - primary entry point
export { DiagramModulesAgentFacade } from "./facade";
