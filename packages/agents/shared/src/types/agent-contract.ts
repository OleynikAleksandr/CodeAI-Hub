/**
 * Base type for JSON object records used in schemas and contracts.
 */
export type JsonRecord = Record<string, unknown>;

/**
 * Base interface for agent output paths.
 * Each agent defines its own artifact paths structure.
 */
export type AgentOutputPaths = Readonly<Record<string, string>>;

/**
 * Base interface for agent contract payload.
 * All agent-specific contracts extend this interface.
 */
export interface BaseAgentContract<
  TOutputPaths extends AgentOutputPaths = AgentOutputPaths,
> {
  /** Output paths for generated artifacts */
  readonly outputPaths: TOutputPaths;
  /** System prompt for the agent */
  readonly prompt: string;
  /** JSON Schema for structured output validation */
  readonly schema: JsonRecord;
  /** Template for the primary artifact */
  readonly template: string;
  /** Version hash for cache invalidation */
  readonly version: string;
}

/**
 * Template file paths configuration for agent asset loading.
 */
export interface AgentTemplatePaths {
  /** Path to the system prompt file */
  readonly promptPath: string;
  /** Path to the JSON schema file */
  readonly schemaPath: string;
  /** Path to the artifact template file */
  readonly templatePath: string;
}
