/**
 * Canonical Session Preamble Resolver — builds a provider-neutral
 * preamble for switch/takeover that contains only portable context.
 */

export interface CanonicalSessionPreamble {
  readonly canonicalArtifacts: readonly { path: string; reason: string }[];
  readonly continuationInstructions: string;
  readonly currentObjective: string;
  readonly language: string;
  readonly stage: string | null;
}

const STAGE_OBJECTIVES: Record<string, string> = {
  description:
    "Help the user define and refine their product description through a questionnaire-driven dialog.",
  virtual_simulation:
    "Generate virtual simulation scenarios based on the approved product description.",
  diagram_modules:
    "Build and refine the product module graph (Product Parts, Clusters, Modules) interactively.",
};

const STAGE_ARTIFACTS: Record<
  string,
  readonly { path: string; reason: string }[]
> = {
  description: [
    {
      path: "Final_Description.md",
      reason: "Canonical product description artifact",
    },
  ],
  virtual_simulation: [
    {
      path: "Final_Description.md",
      reason: "Upstream product description for simulation context",
    },
    {
      path: "virtual-simulation.md",
      reason: "Canonical simulation scenarios artifact",
    },
  ],
  diagram_modules: [
    {
      path: "product-parts.index.md",
      reason: "Module graph index — lists all product parts",
    },
  ],
};

export function resolveCanonicalSessionPreamble(
  stage: string | null,
  workspaceSlug: string
): CanonicalSessionPreamble {
  const stageKey = stage ?? "description";
  const basePath = `~/.codeai-hub/${workspaceSlug}`;

  const artifacts = (STAGE_ARTIFACTS[stageKey] ?? []).map((a) => ({
    path: `${basePath}/${stageKey}/${a.path}`,
    reason: a.reason,
  }));

  return {
    stage,
    language: "Russian",
    currentObjective:
      STAGE_OBJECTIVES[stageKey] ?? "Continue the current workflow dialog.",
    canonicalArtifacts: artifacts,
    continuationInstructions:
      "Continue from the interruption point unless the user asks otherwise. " +
      "Respect canonical artifacts over older assistant assumptions.",
  };
}
