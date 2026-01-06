import type { IdeaContractPayload } from "./contract";
import { buildIdeaContract } from "./contract";
import type { IdeaStructuredOutput } from "./parser";
import {
  parseIdeaOutputFromResultMessage,
  parseIdeaOutputFromText,
} from "./parser";
import type { IdeaArtifactPaths } from "./paths";
import { getIdeaOutputPaths } from "./paths";

/**
 * Idea Collector Facade.
 *
 * Single entry point for all Idea Collector functionality.
 * External systems should interact ONLY through this facade.
 */
export const IdeaCollectorFacade = {
  /**
   * Build the complete contract for Idea Collector agent.
   * Returns prompt, schema, template, questionnaire, output paths, and version.
   *
   * @returns Contract payload or null if required files are missing
   */
  buildContract: async (): Promise<IdeaContractPayload | null> =>
    buildIdeaContract(),

  /**
   * Parse structured output from raw text (JSON).
   *
   * @param text - Raw text output from LLM
   * @returns Parsed output or null if parsing fails
   */
  parseStructuredOutput: (text: string): IdeaStructuredOutput | null =>
    parseIdeaOutputFromText(text),

  /**
   * Parse structured output from a result message object.
   *
   * @param message - Message object with structured_output or structuredOutput field
   * @returns Parsed output or null if parsing fails
   */
  parseStructuredOutputFromMessage: (
    message: unknown
  ): IdeaStructuredOutput | null => parseIdeaOutputFromResultMessage(message),

  /**
   * Get artifact output paths for a specific initiative.
   *
   * @param initiativeSlug - Initiative identifier (defaults to "full-development-flow")
   * @returns Object with idea and virtualSimulation paths
   */
  getArtifactPaths: (initiativeSlug?: string): IdeaArtifactPaths =>
    getIdeaOutputPaths(initiativeSlug),
} as const;
