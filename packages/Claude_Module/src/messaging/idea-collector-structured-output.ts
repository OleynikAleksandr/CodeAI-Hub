/**
 * Idea Collector Structured Output.
 *
 * Re-exports from @codeai-hub/idea-collector package for backward compatibility.
 * All logic has been migrated to the idea-collector package.
 */

import { IdeaCollectorFacade } from "@codeai-hub/idea-collector";

export type { IdeaStructuredOutput as IdeaCollectorStructuredOutput } from "@codeai-hub/idea-collector";

/**
 * Parse structured output from raw text (JSON).
 * Delegates to IdeaCollectorFacade.parseStructuredOutput().
 */
export const parseIdeaCollectorOutputFromText =
  IdeaCollectorFacade.parseStructuredOutput;

/**
 * Parse structured output from a result message object.
 * Delegates to IdeaCollectorFacade.parseStructuredOutputFromMessage().
 */
export const parseIdeaCollectorOutputFromResultMessage =
  IdeaCollectorFacade.parseStructuredOutputFromMessage;
