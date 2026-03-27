import type { JsonRecord } from "./agent-contract";

/**
 * Base interface for agent structured output.
 * All agent-specific outputs extend this interface.
 */
export interface BaseStructuredOutput {
  /** Generated artifact data (agent-specific structure) */
  readonly artifact: JsonRecord | null;
  /** Next action indicator (e.g., 'continue', 'finalize', 'clarify') */
  readonly nextAction: string | null;
  /** Suggested response text to show the user */
  readonly suggestedResponse: string | null;
}

/**
 * Result of parsing structured output from LLM response.
 */
export type StructuredOutputParseResult<T extends BaseStructuredOutput> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };
