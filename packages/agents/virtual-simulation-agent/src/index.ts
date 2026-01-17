/**
 * @codeai-hub/virtual-simulation-agent
 *
 * Virtual Simulation Agent package.
 * Provides contract building, structured output parsing,
 * and artifact path resolution for the Virtual Simulation stage.
 *
 * Usage:
 * ```typescript
 * import { VirtualSimulationAgentFacade } from '@codeai-hub/virtual-simulation-agent';
 *
 * // Build contract for LLM
 * const contract = await VirtualSimulationAgentFacade.buildContract();
 *
 * // Parse LLM response
 * const output = VirtualSimulationAgentFacade.parseStructuredOutput(responseText);
 *
 * // Get artifact paths
 * const paths = VirtualSimulationAgentFacade.getArtifactPaths('my-workspace');
 * ```
 */

/**
 * Package version constant.
 */
export const VIRTUAL_SIMULATION_AGENT_VERSION = "1.1.387";

// Re-export shared types for convenience
export type {
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
} from "@codeai-hub/agent-shared";

// Facade - primary entry point
export { VirtualSimulationAgentFacade } from "./facade";
