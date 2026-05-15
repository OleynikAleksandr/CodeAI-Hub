export interface DiagramModulesPromptSource {
  readonly absolutePath: string;
  readonly content: string;
  readonly label: "Final_Description.md" | "virtual-simulation.md";
  readonly relativePath: string;
}

export interface DiagramModulesPromptBuilderOptions {
  readonly sources: readonly DiagramModulesPromptSource[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DiagramModulesProductPartContinuationPromptOptions {
  readonly acceptedPartIds: readonly string[];
  readonly currentPartId: string;
  readonly expectedArtifactPath: string;
}

export interface DiagramModulesProductPartRepairPromptOptions {
  readonly currentPartId: string | null;
  readonly diagnostics: readonly string[];
  readonly workspaceSlug: string;
}

const buildTargetPaths = (workspaceSlug: string): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/<part-id>.md`,
  `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.flow.json`,
];

const formatSource = (source: DiagramModulesPromptSource): string =>
  [
    `### ${source.label}`,
    `Relative path: \`${source.relativePath}\``,
    `Absolute path: \`${source.absolutePath}\``,
    "",
    "```md",
    source.content.trim(),
    "```",
  ].join("\n");

export const buildDiagramModulesManagedPrompt = (
  options: DiagramModulesPromptBuilderOptions
): string => {
  const targetPaths = buildTargetPaths(options.workspaceSlug)
    .map((targetPath) => `- \`${targetPath}\``)
    .join("\n");
  const sourceBlocks = options.sources.map(formatSource).join("\n\n");

  return [
    "# Diagram Modules Managed Phase 1",
    "",
    "You are the Diagram Modules Agent for CodeAI Hub.",
    "",
    "Core has opened a managed Type A phase. Your job is to create or repair only the Diagram Modules artifacts listed below.",
    "",
    "## Core-owned boundaries",
    "",
    "- Do not run Git commands.",
    "- Do not edit child plans, task status, commit hashes, or workspace ledgers.",
    "- Do not claim Core acceptance, downstream unlock, or managed commit completion.",
    "- Stop after the Diagram Modules artifacts are written and summarize what changed.",
    "",
    "## Target artifacts",
    "",
    targetPaths,
    "",
    "## Required artifact shape",
    "",
    "- `product-parts.index.md` lists every Product Part id, display name, purpose, and generation status.",
    "- `product-parts/<part-id>.md` describes each Product Part with clusters, modules, responsibilities, and dependencies.",
    "- `module-map.flow.json` is a layout/view sidecar only; Markdown artifacts remain semantic SSOT.",
    "",
    "## Runtime workspace",
    "",
    `Workspace slug: \`${options.workspaceSlug}\``,
    `Workspace root: \`${options.workspaceRoot}\``,
    "",
    "## Inline upstream sources",
    "",
    sourceBlocks,
  ].join("\n");
};

export const buildDiagramModulesProductPartContinuationPrompt = (
  options: DiagramModulesProductPartContinuationPromptOptions
): string =>
  [
    "Core accepted the previous Diagram Modules artifact.",
    "This Core continuation message is the authoritative scope for the current turn.",
    "",
    "Next target artifact:",
    `\`${options.expectedArtifactPath}\``,
    "",
    `Materialize only Product Part "${options.currentPartId}".`,
    `Required Product Part heading: \`# Product Part: ${options.currentPartId}\`.`,
    options.acceptedPartIds.length > 0
      ? `Already accepted Product Parts: ${options.acceptedPartIds.join(", ")}.`
      : "No Product Part artifacts have been accepted yet.",
    "Do not edit accepted Product Parts unless Core explicitly names them in this message.",
    "Do not create or update any other Product Part file in this turn.",
    "Do not continue to the next Product Part by yourself.",
    "When ready, stop with a content-readiness note for Core validation.",
  ].join("\n");

export const buildDiagramModulesProductPartRepairPrompt = (
  options: DiagramModulesProductPartRepairPromptOptions
): string => {
  const expectedArtifactPath = options.currentPartId
    ? `.codeai-hub/${options.workspaceSlug}/diagram_modules/product-parts/${options.currentPartId}.md`
    : `.codeai-hub/${options.workspaceSlug}/diagram_modules/product-parts.index.md`;
  return [
    "Core rejected the current Diagram Modules subturn.",
    "Repair only the artifact named below and then stop for Core validation.",
    "",
    "Target artifact:",
    `\`${expectedArtifactPath}\``,
    "",
    "Diagnostics:",
    ...options.diagnostics.map((diagnostic) => `- ${diagnostic}`),
    "",
    ...(options.currentPartId
      ? [
          "Required Product Part heading:",
          `\`# Product Part: ${options.currentPartId}\``,
          "",
        ]
      : []),
    "Do not edit accepted Product Parts.",
    "Do not continue to the next Product Part by yourself.",
  ].join("\n");
};

export const buildDiagramModulesManagedCommitBoundaryBlockedMessage = (
  details: string
): string =>
  [
    "Core blocked Diagram Modules continuation before the managed commit boundary completed.",
    "",
    details,
  ].join("\n");

export const buildDiagramModulesManagedContinuationMessage = (
  currentPartId: string | null
): string =>
  [
    "Core accepted the current Diagram Modules artifact.",
    `Next subturn: ${currentPartId ?? "none"}.`,
  ].join("\n");

export const buildDiagramModulesUserReviewMessage = (): string =>
  [
    "Core completed Diagram Modules artifact validation.",
    "",
    "All Product Part diagrams have been created. User review is now open: check the diagrams for semantic correctness.",
    "",
    'If everything is acceptable, reply with "подтверждаю". If changes are needed, list the corrections before Diagram Modules is completed.',
  ].join("\n");
