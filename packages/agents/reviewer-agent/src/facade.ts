/**
 * Reviewer Agent Facade.
 *
 * Single entry point for all Reviewer Agent functionality.
 * External systems should interact ONLY through this facade.
 */
export const ReviewerAgentFacade = {
  /**
   * Build the complete contract for the Reviewer agent.
   * Returns prompt, template, output paths, and version.
   *
   * @returns Contract payload or null if required files are missing
   */
  buildContract: async (): Promise<null> => null,

  /**
   * Parse structured output from raw text (JSON).
   *
   * @param text - Raw text output from LLM
   * @returns Parsed output or null if parsing fails
   */
  parseStructuredOutput: (_text: string): null => null,

  /**
   * Parse structured output from a result message object.
   *
   * @param message - Message object with structured_output or structuredOutput field
   * @returns Parsed output or null if parsing fails
   */
  parseStructuredOutputFromMessage: (_message: unknown): null => null,

  /**
   * Get artifact output paths for a specific workspace.
   *
   * @param workspaceSlug - Workspace identifier
   * @returns Object with reviewer artifact paths
   */
  getArtifactPaths: (_workspaceSlug?: string): Record<string, string> => ({}),
} as const;
