/**
 * Idea Collector artifact paths configuration.
 * Defines where templates are read from and where artifacts are written.
 */

/**
 * Flow and stage identifiers.
 */
export const FLOW_NAME = "full-development-flow";
export const IDEA_STAGE = "idea";
export const DEFAULT_INITIATIVE_SLUG = "unknown-initiative";
export const DEFAULT_RUN_SLUG = "000-unknown";

/**
 * Template paths (where assets are installed).
 * Templates are installed to ~/.codeai-hub/templates/ by the extension.
 */
export const IDEA_TEMPLATE_ROOT = `~/.codeai-hub/templates/${FLOW_NAME}/${IDEA_STAGE}`;

export const IDEA_TEMPLATE_PATHS = {
  prompt: `${IDEA_TEMPLATE_ROOT}/idea-collector-prompt.md`,
  schema: `${IDEA_TEMPLATE_ROOT}/idea-collector-schema.json`,
  template: `${IDEA_TEMPLATE_ROOT}/idea-template.md`,
  questionnaire: `${IDEA_TEMPLATE_ROOT}/questionnaire-template.md`,
} as const;

/**
 * Output paths (where artifacts are saved).
 * Paths are relative to workspace root.
 */
export const IDEA_OUTPUT_PATHS = {
  idea: `.codeai-hub/${DEFAULT_INITIATIVE_SLUG}/description/Final_Description.md`,
  virtualSimulation: `.codeai-hub/${DEFAULT_INITIATIVE_SLUG}/virtual_simulation/virtual-simulation.md`,
} as const;

/**
 * Dynamic output paths type.
 */
export type IdeaArtifactPaths = {
  readonly idea: string;
  readonly virtualSimulation: string;
};

/**
 * Get artifact output paths for a specific initiative.
 * `runSlug` is retained only for compatibility with older callers.
 */
export const getIdeaOutputPaths = (
  initiativeSlug: string = DEFAULT_INITIATIVE_SLUG,
  // Description cleanup removes run-scoped artifact paths from the live schema.
  _runSlug: string = DEFAULT_RUN_SLUG
): IdeaArtifactPaths => ({
  idea: `.codeai-hub/${initiativeSlug}/description/Final_Description.md`,
  virtualSimulation: `.codeai-hub/${initiativeSlug}/virtual_simulation/virtual-simulation.md`,
});

/**
 * Schema path for template injection.
 * Defines where in the schema to inject the idea template.
 */
export const IDEA_MARKDOWN_SCHEMA_PATH = ["artifact", "idea_markdown"];
