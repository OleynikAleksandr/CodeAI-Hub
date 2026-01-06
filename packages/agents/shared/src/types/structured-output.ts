import type { JsonRecord } from "./agent-contract";

/**
 * Base interface for agent structured output.
 * All agent-specific outputs extend this interface.
 */
export type BaseStructuredOutput = {
  /** Suggested response text to show the user */
  readonly suggestedResponse: string | null;
  /** Russian-language reasoning summary for thinking panel */
  readonly reasoningSummaryRu: string | null;
  /** Next action indicator (e.g., 'continue', 'finalize', 'clarify') */
  readonly nextAction: string | null;
  /** Generated artifact data (agent-specific structure) */
  readonly artifact: JsonRecord | null;
};

/**
 * Result of parsing structured output from LLM response.
 */
export type StructuredOutputParseResult<T extends BaseStructuredOutput> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };
