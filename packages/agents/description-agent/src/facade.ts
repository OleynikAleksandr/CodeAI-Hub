/**
 * Description Agent Facade.
 *
 * Single entry point for all Description Agent functionality.
 * External systems should interact ONLY through this facade.
 */
export const DescriptionAgentFacade = {
  /**
   * Build the complete contract for the Description agent.
   * Returns prompt, template, questionnaire, output paths, and version.
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
   * @returns Object with description artifact paths
   */
  getArtifactPaths: (_workspaceSlug?: string): Record<string, string> => ({}),
} as const;
