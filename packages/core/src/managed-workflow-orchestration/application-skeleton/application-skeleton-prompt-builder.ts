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

const formatDiagnostics = (
  diagnostics: readonly string[]
): readonly string[] =>
  diagnostics.length > 0
    ? diagnostics.map((diagnostic) => `- ${diagnostic}`)
    : ["- Core validation did not provide a detailed diagnostic."];

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

export const buildApplicationSkeletonUserReviewMessage = (): string =>
  [
    "Core completed Application Skeleton draft validation.",
    "",
    "The artifact shape is valid, so user review is now open.",
    "",
    'Review the Application Skeleton contract semantically. If everything is acceptable, reply with "подтверждаю". If changes are needed, list the corrections before materialization.',
  ].join("\n");

export const buildApplicationSkeletonMaterializationPrompt = (options: {
  readonly workspaceSlug: string;
}): string =>
  [
    "Core opens Phase 3 Application Skeleton Materialization.",
    "",
    "The user accepted the Application Skeleton contract. Materialize it into the workspace filesystem.",
    "",
    "Allowed artifacts and paths:",
    ...buildContractArtifactPaths(options.workspaceSlug).map(
      (artifactPath) => `- \`${artifactPath}\``
    ),
    "- production scaffold paths declared by `application-skeleton-map.json`",
    "- `package.json`, lockfiles, and `tsconfig*.json` only when required by the accepted skeleton",
    "",
    "Update the canonical Application Skeleton artifacts so they reflect materialized state.",
    "Required lifecycle state after successful materialization:",
    "- `accepted: true`",
    "- `materialized: true`",
    '- `materializationState: "materialized"`',
    '- `reviewState: "materialized"`',
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
    "Core blocked Application Skeleton continuation before the managed commit boundary completed.",
    "",
    details,
  ].join("\n");

export const buildApplicationSkeletonPersistentReturnMessage = (): string =>
  [
    "Core accepted Application Skeleton materialization.",
    "",
    "The workspace filesystem scaffold has been created and recorded in Git. The Application Skeleton step is complete, and a persistent return phase is open for later corrections.",
    "",
    "The input field is available for future Application Skeleton changes. If no changes are needed now, continue to the next workflow step.",
  ].join("\n");
