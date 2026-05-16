export interface ApplicationSkeletonRepairPromptOptions {
  readonly diagnostics: readonly string[];
  readonly workspaceSlug: string;
}

export interface ApplicationSkeletonMaterializationRepairPromptOptions
  extends ApplicationSkeletonRepairPromptOptions {
  readonly attemptNumber: number;
  readonly rejectedCommitHash?: string | null;
}

const buildContractArtifactPaths = (
  workspaceSlug: string
): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
  `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
];

const CANONICAL_MARKDOWN_HEADINGS: readonly string[] = [
  "# Application Skeleton",
  "## Overview",
  "## Architecture",
  "## Stack",
  "## Product Parts",
  "## Filesystem",
  "## Materialization",
  "## Assumptions",
];

const formatCanonicalHeadingList = (): string =>
  CANONICAL_MARKDOWN_HEADINGS.map((heading) => `\`${heading}\``).join(", ");

const explainDiagnostic = (diagnostic: string): string => {
  if (diagnostic.startsWith("json_parse_error:")) {
    return `Fix \`application-skeleton-map.json\`; it is not valid JSON. Parser detail: ${diagnostic
      .replace("json_parse_error:", "")
      .trim()}`;
  }
  if (diagnostic.startsWith("unsafe_path_value:")) {
    return `Fix the unsafe path in \`application-skeleton-map.json\`: ${diagnostic
      .replace("unsafe_path_value:", "")
      .trim()}. Use repository-relative production paths only; do not use absolute paths, \`..\`, or \`node_modules\`.`;
  }
  if (diagnostic === "missing_required_field: productParts or planned paths") {
    return "Add either a non-empty `productParts` tree or explicit `plannedPaths` to `application-skeleton-map.json` so Core can validate the planned scaffold.";
  }
  const knownDiagnostics: Readonly<Record<string, string>> = {
    json_root_not_object:
      "Make `application-skeleton-map.json` a single JSON object at the root.",
    markdown_missing_required_section: `Use the canonical Markdown section structure in \`application-skeleton.md\`. Include these exact English headings: ${formatCanonicalHeadingList()}. Localize only the prose inside the sections.`,
    markdown_premature_acceptance:
      "Remove draft-time acceptance from `application-skeleton.md`; the user has not accepted this contract yet.",
    markdown_premature_materialization:
      "Remove draft-time materialization from `application-skeleton.md`; production scaffold materialization is not open yet.",
    markdown_wrong_stage:
      "Set the first Markdown heading to exactly `# Application Skeleton`.",
    missing_map_json:
      "Create `application-skeleton-map.json` with the Application Skeleton JSON contract.",
    missing_markdown:
      "Create `application-skeleton.md` with the canonical Application Skeleton Markdown contract.",
    premature_accepted_true:
      "Set the draft JSON lifecycle state to `accepted: false`; Core opens acceptance only after user review.",
    premature_materialization_state:
      'Set the draft JSON lifecycle state to `materializationState: "not_started"`; materialization is not open yet.',
    premature_materialized_true:
      "Set the draft JSON lifecycle state to `materialized: false`; production scaffold files must not be created during the draft turn.",
  };
  return knownDiagnostics[diagnostic] ?? diagnostic;
};

const formatDiagnostics = (
  diagnostics: readonly string[]
): readonly string[] =>
  diagnostics.length > 0
    ? diagnostics.map((diagnostic) => `- ${explainDiagnostic(diagnostic)}`)
    : ["- Core validation did not provide a detailed diagnostic."];

const explainBoundaryDetails = (details: string): string => {
  if (details.includes("active commit-backed microtask")) {
    return "The stage todo-plan has no active Application Skeleton microtask with a paired `Git Commit: ...` item. Core must open that plan task pair before the agent continues.";
  }
  if (details.includes("validation did not accept")) {
    return "Core validation did not accept the current Application Skeleton artifact. Core should dispatch a repair prompt tied to the active stage-plan task.";
  }
  return details;
};

export const buildApplicationSkeletonDraftRepairPrompt = (
  options: ApplicationSkeletonRepairPromptOptions
): string =>
  [
    "Core rejected the current Application Skeleton draft.",
    "Repair only the Application Skeleton contract artifacts and then stop for Core validation.",
    "",
    "Target artifacts:",
    ...buildContractArtifactPaths(options.workspaceSlug).map(
      (artifactPath) => `- \`${artifactPath}\``
    ),
    "",
    "Diagnostics:",
    ...formatDiagnostics(options.diagnostics),
    "",
    "Do not set `accepted: true`.",
    "Do not set `materialized: true`.",
    "Do not create production scaffold files or Product Part folders.",
    "Do not run Git commands or edit managed plan files.",
  ].join("\n");

export const buildApplicationSkeletonMaterializationPrompt = (options: {
  readonly workspaceSlug: string;
}): string =>
  [
    "Core opens Phase 3 Application Skeleton Materialization.",
    "",
    "The user accepted the Application Skeleton contract. Materialize the installable project foundation and workspace filesystem projection.",
    "",
    "Allowed artifacts and paths:",
    ...buildContractArtifactPaths(options.workspaceSlug).map(
      (artifactPath) => `- \`${artifactPath}\``
    ),
    "- production scaffold paths declared by `application-skeleton-map.json`",
    "- package manifests, lockfiles, package-manager metadata, and `tsconfig*.json` required by the accepted foundation",
    "- minimal source entrypoints/facades declared by `projectFoundation.firstWaveEntrypoints`",
    "",
    "Update the canonical Application Skeleton artifacts so they reflect materialized state.",
    "Required lifecycle state after successful materialization:",
    "- `accepted: true`",
    "- `materialized: true`",
    '- `materializationState: "materialized"`',
    '- `reviewState: "materialized"`',
    "- `openQuestions` absent or empty",
    "",
    "Do not run Git commands or edit managed plan files.",
    "When materialization is ready, stop with a content-readiness note for Core validation.",
  ].join("\n");

export const buildApplicationSkeletonMaterializationRepairPrompt = (
  options: ApplicationSkeletonMaterializationRepairPromptOptions
): string =>
  [
    `Core rejected Application Skeleton materialization attempt ${options.attemptNumber}.`,
    "",
    ...(options.rejectedCommitHash
      ? [
          "The safe attempt was committed as workflow history:",
          `- ${options.rejectedCommitHash}`,
          "",
        ]
      : []),
    "Diagnostics:",
    ...formatDiagnostics(options.diagnostics),
    "",
    "Repair the materialization within the current Application Skeleton scope.",
    "Change only the contract artifacts and production scaffold paths declared by the accepted map.",
    "Do not run Git commands or edit managed plan files.",
    "When the repair is ready, stop with a content-readiness note for Core validation.",
  ].join("\n");

export const buildApplicationSkeletonBoundaryBlockedMessage = (
  details: string
): string =>
  [
    "CodeAI Core cannot continue the `Application Skeleton` step yet.",
    "",
    `Reason: ${explainBoundaryDetails(details)}`,
    "",
    "This is an orchestrator plan-state problem, not an agent artifact problem. Do not ask Project Manager or the agent to bypass it.",
    "Core must repair the managed stage plan or finish the blocked Git commit boundary, then retry Application Skeleton validation.",
  ].join("\n");

export const buildApplicationSkeletonPersistentReturnMessage = (): string =>
  [
    "Core accepted Application Skeleton materialization.",
    "",
    "The installable project foundation and workspace filesystem scaffold have been created and recorded in Git. The Application Skeleton step is complete, and a persistent return phase is open for later corrections.",
    "",
    "The input field is available for future Application Skeleton changes. If no changes are needed now, continue to the next workflow step.",
  ].join("\n");
