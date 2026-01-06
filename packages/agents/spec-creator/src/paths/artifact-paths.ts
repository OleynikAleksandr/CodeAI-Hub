/**
 * Spec Creator artifact paths configuration.
 * Defines where templates are read from and where artifacts are written.
 */

/**
 * Flow and stage identifiers.
 */
export const FLOW_NAME = "full-development-flow";
export const SPEC_STAGE = "spec";
export const DEFAULT_INITIATIVE_SLUG = "full-development-flow";

/**
 * Template paths (where assets are installed).
 * Templates are installed to ~/.codeai-hub/templates/ by the extension.
 */
export const SPEC_TEMPLATE_ROOT = `~/.codeai-hub/templates/${FLOW_NAME}/${SPEC_STAGE}`;

export const SPEC_TEMPLATE_PATHS = {
  prompt: `${SPEC_TEMPLATE_ROOT}/spec-creator-prompt.md`,
  schema: `${SPEC_TEMPLATE_ROOT}/spec-creator-schema.json`,
  template: `${SPEC_TEMPLATE_ROOT}/spec-template.md`,
} as const;

/**
 * Output paths (where artifacts are saved).
 * Paths are relative to workspace root.
 */
export const SPEC_OUTPUT_ROOT = `.codeai-hub/${FLOW_NAME}/initiatives/${DEFAULT_INITIATIVE_SLUG}/${SPEC_STAGE}`;

export const SPEC_OUTPUT_PATHS = {
  specification: `${SPEC_OUTPUT_ROOT}/specification.md`,
  technicalDesign: `${SPEC_OUTPUT_ROOT}/technical-design.md`,
} as const;

/**
 * Dynamic output paths type.
 */
export type SpecArtifactPaths = {
  readonly specification: string;
  readonly technicalDesign: string;
};

/**
 * Get artifact output paths for a specific initiative.
 * Allows customization of the initiative slug.
 */
export const getSpecOutputPaths = (
  initiativeSlug: string = DEFAULT_INITIATIVE_SLUG
): SpecArtifactPaths => {
  const root = `.codeai-hub/${FLOW_NAME}/initiatives/${initiativeSlug}/${SPEC_STAGE}`;
  return {
    specification: `${root}/specification.md`,
    technicalDesign: `${root}/technical-design.md`,
  };
};

/**
 * Schema path for template injection.
 * Defines where in the schema to inject the spec template.
 */
export const SPEC_MARKDOWN_SCHEMA_PATH = ["artifact", "specification_markdown"];
