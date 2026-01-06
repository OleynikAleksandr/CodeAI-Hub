import type { SpecContractPayload } from "./contract";
import { buildSpecContract } from "./contract";
import type { SpecStructuredOutput } from "./parser";
import {
  parseSpecOutputFromResultMessage,
  parseSpecOutputFromText,
} from "./parser";
import type { SpecArtifactPaths } from "./paths";
import { getSpecOutputPaths } from "./paths";

/**
 * Spec Creator Facade.
 *
 * Single entry point for all Spec Creator functionality.
 * External systems should interact ONLY through this facade.
 */
export const SpecCreatorFacade = {
  /**
   * Build the complete contract for Spec Creator agent.
   * Returns prompt, schema, template, output paths, and version.
   *
   * @returns Contract payload or null if required files are missing
   */
  buildContract: async (): Promise<SpecContractPayload | null> =>
    buildSpecContract(),

  /**
   * Parse structured output from raw text (JSON).
   *
   * @param text - Raw text output from LLM
   * @returns Parsed output or null if parsing fails
   */
  parseStructuredOutput: (text: string): SpecStructuredOutput | null =>
    parseSpecOutputFromText(text),

  /**
   * Parse structured output from a result message object.
   *
   * @param message - Message object with structured_output or structuredOutput field
   * @returns Parsed output or null if parsing fails
   */
  parseStructuredOutputFromMessage: (
    message: unknown
  ): SpecStructuredOutput | null => parseSpecOutputFromResultMessage(message),

  /**
   * Get artifact output paths for a specific initiative.
   *
   * @param initiativeSlug - Initiative identifier (defaults to "full-development-flow")
   * @returns Object with specification and technicalDesign paths
   */
  getArtifactPaths: (initiativeSlug?: string): SpecArtifactPaths =>
    getSpecOutputPaths(initiativeSlug),
} as const;
