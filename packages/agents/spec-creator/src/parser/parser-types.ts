import type { BaseStructuredOutput } from "@codeai-hub/agent-shared";

/**
 * Spec artifact data from LLM structured output.
 */
export type SpecArtifact = {
  readonly specification_markdown?: string;
  readonly technical_design_markdown?: string;
  readonly [key: string]: unknown;
};

/**
 * Structured output from Spec Creator agent.
 * Extends BaseStructuredOutput with spec-specific fields.
 */
export type SpecStructuredOutput = BaseStructuredOutput & {
  readonly artifact: SpecArtifact | null;
};

/**
 * Result of parsing structured output.
 * Contains either the parsed output or null on failure.
 */
export type SpecParseResult = {
  readonly success: boolean;
  readonly output: SpecStructuredOutput | null;
  readonly error?: string;
};
