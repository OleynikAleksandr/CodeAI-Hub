import type { SpecArtifact, SpecStructuredOutput } from "./parser-types";

/**
 * Parse structured output from raw JSON text.
 *
 * @param text - Raw JSON text from LLM response
 * @returns Parsed output or null if parsing fails
 */
export const parseSpecOutputFromText = (
  text: string
): SpecStructuredOutput | null => {
  if (!text?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return normalizeSpecOutput(parsed);
  } catch {
    return null;
  }
};

/**
 * Parse structured output from a result message object.
 *
 * @param message - Message object with structured_output or structuredOutput field
 * @returns Parsed output or null if parsing fails
 */
export const parseSpecOutputFromResultMessage = (
  message: unknown
): SpecStructuredOutput | null => {
  if (!message || typeof message !== "object") {
    return null;
  }

  const msg = message as Record<string, unknown>;

  // Try different field names
  const structuredOutput =
    msg.structured_output ?? msg.structuredOutput ?? msg.output;

  if (!structuredOutput) {
    return null;
  }

  // If it's a string, parse it
  if (typeof structuredOutput === "string") {
    return parseSpecOutputFromText(structuredOutput);
  }

  // If it's an object, normalize it directly
  if (typeof structuredOutput === "object") {
    return normalizeSpecOutput(structuredOutput as Record<string, unknown>);
  }

  return null;
};

/**
 * Normalize parsed JSON into SpecStructuredOutput format.
 */
const normalizeSpecOutput = (
  data: Record<string, unknown>
): SpecStructuredOutput => {
  const artifact = extractArtifact(data);

  return {
    suggestedResponse: extractString(
      data,
      "suggestedResponse",
      "suggested_response"
    ),
    nextAction: extractString(data, "nextAction", "next_action"),
    artifact,
  };
};

/**
 * Extract string field from data using multiple possible keys.
 */
const extractString = (
  data: Record<string, unknown>,
  ...keys: string[]
): string | null => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
};

/**
 * Extract artifact from parsed data.
 */
const extractArtifact = (
  data: Record<string, unknown>
): SpecArtifact | null => {
  // Try direct artifact field
  if (data.artifact && typeof data.artifact === "object") {
    return data.artifact as SpecArtifact;
  }

  // Try to construct from top-level fields
  const specMarkdown =
    data.specification_markdown ?? data.specificationMarkdown;
  const techDesignMarkdown =
    data.technical_design_markdown ?? data.technicalDesignMarkdown;

  if (specMarkdown || techDesignMarkdown) {
    return {
      specification_markdown: specMarkdown as string | undefined,
      technical_design_markdown: techDesignMarkdown as string | undefined,
    };
  }

  return null;
};
