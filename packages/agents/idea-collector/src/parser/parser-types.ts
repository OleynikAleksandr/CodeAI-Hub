import type { BaseStructuredOutput } from "@codeai-hub/agent-shared";

/**
 * Idea artifact data from LLM structured output.
 */
export type IdeaArtifact = {
  readonly idea_markdown?: string;
  readonly virtual_simulation_markdown?: string;
  readonly [key: string]: unknown;
};

/**
 * Structured output from Idea Collector agent.
 * Extends BaseStructuredOutput with idea-specific fields.
 */
export type IdeaStructuredOutput = BaseStructuredOutput & {
  readonly artifact: IdeaArtifact | null;
};

/**
 * Result of parsing structured output.
 * Contains either the parsed output or null on failure.
 */
export type IdeaParseResult = {
  readonly success: boolean;
  readonly output: IdeaStructuredOutput | null;
  readonly error?: string;
};
