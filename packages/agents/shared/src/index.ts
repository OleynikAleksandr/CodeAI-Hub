/**
 * @codeai-hub/agent-shared
 *
 * Shared utilities and types for CodeAI Hub agent packages.
 * This package provides common functionality used by all agent packages
 * (idea-collector, spec-creator, plan-builder, etc.).
 */

/**
 * Package version constant.
 * Used for debugging and version tracking.
 */
export const AGENT_SHARED_VERSION = "1.1.387";

// Types
export type {
  AgentOutputPaths,
  AgentTemplatePaths,
  BaseAgentContract,
  BaseStructuredOutput,
  JsonRecord,
  StructuredOutputParseResult,
} from "./types";
