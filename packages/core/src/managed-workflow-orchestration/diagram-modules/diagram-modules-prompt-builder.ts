import { BUNDLED_TEMPLATE_SOURCES } from "../../templates/bundled-templates";

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
  readonly attemptNumber?: number;
  readonly currentPartId: string | null;
  readonly diagnostics: readonly string[];
  readonly rejectedCommitHash?: string | null;
  readonly workspaceSlug: string;
}

const buildTargetPaths = (workspaceSlug: string): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/<part-id>.md`,
  `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.flow.json`,
];

const DIAGRAM_MODULES_ARTIFACT_CONTRACT_TEMPLATE_IDS = [
  "product-parts-index-template",
  "product-part-template",
  "diagram-modules-field-reference",
  "diagram-modules-merge-rules",
] as const;

const PRODUCT_PART_TURN_TEMPLATE_IDS = [
  "product-part-template",
  "diagram-modules-field-reference",
  "diagram-modules-merge-rules",
] as const;

const INDEX_TURN_TEMPLATE_IDS = [
  "product-parts-index-template",
  "diagram-modules-field-reference",
  "diagram-modules-merge-rules",
] as const;

const decodeBundledTemplate = (id: string): string => {
  const source = BUNDLED_TEMPLATE_SOURCES.find((entry) => entry.id === id);
  if (!source) {
    throw new Error(`Missing bundled Diagram Modules template: ${id}`);
  }
  return Buffer.from(source.base64, "base64").toString("utf8").trim();
};

const formatEmbeddedTemplate = (id: string): readonly string[] => [
  `### ${id}`,
  "",
  "```md",
  decodeBundledTemplate(id),
  "```",
];

const buildEmbeddedArtifactContract = (
  templateIds: readonly string[]
): readonly string[] => [
  "## Embedded artifact contract templates",
  "",
  "The following templates and field references are part of this prompt. Use this inline text as the authoritative artifact contract; do not search for template files on disk.",
  "",
  ...templateIds.flatMap(formatEmbeddedTemplate),
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
    "- `product-parts.index.md` must declare `leadProductPartId`: the single Product Part that owns the first Development Tree contract orchestration session.",
    "- `product-parts.index.md` must declare `productPartLeadershipOrder`: every Product Part id exactly once, ordered by leadership/contract orchestration priority, with the lead Product Part first.",
    "- `product-parts/<part-id>.md` describes each Product Part with clusters, modules, responsibilities, and dependencies.",
    "- `module-map.flow.json` is a layout/view sidecar only; Markdown artifacts remain semantic SSOT.",
    "",
    "## Leadership selection rules",
    "",
    "- Select the lead Product Part before ordering the index. The lead is the Product Part that can own the first Development Tree contract orchestration session for the whole application.",
    "- Prefer the Product Part that owns application-wide domain/runtime/orchestration contracts: core runtime, backend/domain core, workflow engine, application kernel, or equivalent.",
    "- If there is only one Product Part, that Product Part is the lead.",
    "- If there is no separate core/runtime/domain Product Part, choose the Product Part that defines the main user/business flows and can name the contracts required from the other parts.",
    "- Do not choose a thin distribution, installer, launcher, IDE extension shell, adapter, provider pack, or integration-only part as lead unless it is the only real Product Part.",
    "- `productPartLeadershipOrder` must start with `leadProductPartId`, then list the remaining Product Parts by contract-dependency priority: contract owners before consumers, user/business flow owners before adapters/providers, distribution surfaces last unless they own product-wide contracts.",
    "- Every planned Product Part id must appear exactly once. Do not include unknown ids, duplicate ids, clusters, modules, or implementation packages in this order.",
    "- If leadership is ambiguous, still choose the most defensible lead and record the assumption in `## Assumptions / Open Questions`.",
    "",
    ...buildEmbeddedArtifactContract(
      DIAGRAM_MODULES_ARTIFACT_CONTRACT_TEMPLATE_IDS
    ),
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
    "Continue in the same managed Diagram Modules session. The full artifact contract was embedded in the first managed prompt; do not ask Core to resend it.",
    "This Core continuation message is only the delta scope for the current turn.",
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
    "",
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
    `Repair attempt: ${options.attemptNumber ?? 1}.`,
    options.rejectedCommitHash
      ? `Rejected attempt commit: ${options.rejectedCommitHash}.`
      : "Rejected attempt commit: not recorded.",
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
    ...buildEmbeddedArtifactContract(
      options.currentPartId
        ? PRODUCT_PART_TURN_TEMPLATE_IDS
        : INDEX_TURN_TEMPLATE_IDS
    ),
    "",
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
