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
