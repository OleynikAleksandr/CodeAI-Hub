import {
  buildVerificationEvidenceRepairContract,
  formatDiagnostics,
} from "./quality-gates-diagnostics-explainer";

export interface QualityGatesRepairPromptOptions {
  readonly diagnostics: readonly string[];
  readonly workspaceSlug: string;
}

export interface QualityGatesIntegrationRepairPromptOptions
  extends QualityGatesRepairPromptOptions {
  readonly attemptNumber: number;
  readonly rejectedCommitHash?: string | null;
}

const QUALITY_GATES_STAGE_TODO_PLAN_PATH =
  "doc/TODO/stages/quality-gates/todo-plan.md";
const buildPhaseEnvelope = (title: string): readonly string[] => [
  title,
  `Active stage todo-plan: \`${QUALITY_GATES_STAGE_TODO_PLAN_PATH}\`.`,
  "Treat this as a zero-context Core phase prompt; continue only from this phase envelope, listed artifacts, and diagnostics.",
  "",
];

const buildContractArtifactPaths = (
  workspaceSlug: string
): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates-research.md`,
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates-research.json`,
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
];

const buildDraftContractArtifactPaths = (
  workspaceSlug: string
): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
];

const buildResearchArtifactPaths = (
  workspaceSlug: string
): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates-research.md`,
  `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates-research.json`,
];

const isResearchFirstDiagnostic = (diagnostic: string): boolean =>
  diagnostic === "quality_gates_contract_before_research_review" ||
  diagnostic.startsWith("research_") ||
  diagnostic.startsWith("missing_quality_gates_research_");

const explainBoundaryDetails = (details: string): string => {
  if (details.includes("active commit-backed microtask")) {
    return "The stage todo-plan has no active Quality Gates microtask with a paired `Git Commit: ...` item. Core must open that plan task pair before the agent continues.";
  }
  if (details.includes("validation did not accept")) {
    return "Core validation did not accept the current Quality Gates artifact. Core should dispatch a repair prompt tied to the active stage-plan task.";
  }
  return details;
};

export const buildQualityGatesDraftRepairPrompt = (
  options: QualityGatesRepairPromptOptions
): string => {
  const researchOnly = options.diagnostics.some(isResearchFirstDiagnostic);
  const targetArtifacts = researchOnly
    ? buildResearchArtifactPaths(options.workspaceSlug)
    : buildDraftContractArtifactPaths(options.workspaceSlug);
  return [
    ...buildPhaseEnvelope(
      researchOnly
        ? "Core opens Phase 1 Quality Gates Research Repair."
        : "Core opens Phase 2 Quality Gates Contract Repair."
    ),
    "Core rejected the current Quality Gates draft.",
    researchOnly
      ? "Repair only the Quality Gates research artifacts and then stop for Core validation."
      : "Repair only the Quality Gates contract artifacts and then stop for Core validation.",
    "",
    "Target artifacts:",
    ...targetArtifacts.map((artifactPath) => `- \`${artifactPath}\``),
    "",
    "Diagnostics:",
    ...formatDiagnostics(options.diagnostics),
    "",
    "Do not set `accepted: true`.",
    "Do not set `integrated: true`.",
    researchOnly
      ? "The research report is mandatory: create or repair `quality-gates-research.md` and `quality-gates-research.json` before relying on any tool recommendation."
      : "Use the approved research as source of truth, but do not edit `quality-gates-research.md` or `quality-gates-research.json` during contract repair.",
    'Do not convert planned required gates into advisory or deferred gates. A gate in `plannedRequiredAfterIntegration` must keep `desiredStatus: "active"`, `availability: "not_integrated"`, `integrationRequired: true`, and concrete `plannedIntegrationPaths`.',
    "Do not create package scripts, configs, hooks, CI files, gate scripts, Development Tree artifacts, or production code.",
    "Do not run Git commands or edit managed plan files.",
  ].join("\n");
};

export const buildQualityGatesUserReviewMessage = (): string =>
  [
    "Core completed Quality Gates draft validation.",
    "",
    "The artifact shape is valid, so user review is now open.",
    "",
    'Review the Quality Gates contract semantically. If everything is acceptable, reply with "подтверждаю". If changes are needed, list the corrections before integration.',
  ].join("\n");

export const buildQualityGatesResearchUserReviewMessage = (): string =>
  [
    "Core completed Quality Gates research artifact validation.",
    "",
    "The research report shape is valid, so user review is now open before contract drafting.",
    "",
    'Review the found tools and recommendations. If the research is acceptable, reply with "подтверждаю"; Core will then ask the agent to draft the Quality Gates contract from this approved research. If changes are needed, list the corrections first.',
  ].join("\n");

export const buildQualityGatesContractDraftPrompt = (options: {
  readonly workspaceSlug: string;
}): string =>
  [
    ...buildPhaseEnvelope("Core opens Phase 2 Quality Gates Contract Draft."),
    "Core accepted the Quality Gates research report and opens contract drafting.",
    "Use the approved research artifacts as source of truth:",
    `- \`.codeai-hub/${options.workspaceSlug}/quality_gates/quality-gates-research.md\``,
    `- \`.codeai-hub/${options.workspaceSlug}/quality_gates/quality-gates-research.json\``,
    "",
    "Now create only the contract artifacts:",
    `- \`.codeai-hub/${options.workspaceSlug}/quality_gates/quality-gates.md\``,
    `- \`.codeai-hub/${options.workspaceSlug}/quality_gates/quality-gates.json\``,
    "",
    'Keep `accepted: false`, `integrated: false`, and `integrationState: "not_started"`.',
    "Do not create package scripts, configs, hooks, CI files, gate scripts, Development Tree artifacts, or production code.",
    "Do not run Git commands or edit managed plan files.",
    "When the draft contract is ready, stop for Core validation and user review.",
  ].join("\n");

export const buildQualityGatesIntegrationPrompt = (options: {
  readonly workspaceSlug: string;
}): string =>
  [
    ...buildPhaseEnvelope("Core opens Phase 3 Quality Gates Integration."),
    "The user accepted the Quality Gates contract. Integrate the accepted gate baseline into the workspace filesystem.",
    "",
    "Source of truth artifacts:",
    ...buildContractArtifactPaths(options.workspaceSlug).map(
      (artifactPath) => `- \`${artifactPath}\``
    ),
    "",
    "The accepted contract must remain traceable to `quality-gates-research.json`; do not integrate tools that are neither user-selected nor present in the research recommendations.",
    "",
    "Allowed integration scope:",
    "- `package.json` and lockfiles when required by the accepted contract",
    "- `.husky/pre-commit` and `.husky/pre-push`",
    "- `scripts/quality-gates/**`",
    "- quality gate config files and CI/update files explicitly selected by the accepted contract",
    "- Build commands must not write generated binaries or caches anywhere under the workspace root, including `.artifacts/**`; use an operating-system temp directory or another external cache path.",
    "",
    "Required lifecycle state after successful integration:",
    "- `accepted: true`",
    "- `integrated: true`",
    '- `integrationState: "integrated"`',
    "",
    "Every gate listed in a required enforcement array must have an executable command and real enforcement wiring:",
    "- `commands.<gate-id>.proposedCommand` in `quality-gates.json` is the single source of truth for how the gate runs.",
    "- The command must resolve: every `npm run <script>` it uses must exist in `package.json.scripts`. Script names are your choice; a `qg:` prefix is only a recommended style.",
    "- The command must be reachable from the matching hook (`.husky/pre-commit` for `requiredBeforeCommit`, `.husky/pre-push` for `requiredBeforePush`), either directly or through package scripts the hook calls; aggregate scripts are fine.",
    'After a gate is materialized and enforcement evidence exists, remove it from `plannedRequiredAfterIntegration`, keep it only in the required enforcement array, and set `availability: "executable"`.',
    "Gates that do not affect future code yet may remain planned, but then they must not be wired into enforcement hooks.",
    "Do not run Git commands or edit managed plan files.",
    "When integration is ready, stop with a content-readiness note for Core validation. Do not claim the Quality Gates step is complete; Core must open Phase 4 Formal Quality Gates Verification first.",
  ].join("\n");

export const buildQualityGatesIntegrationRepairPrompt = (
  options: QualityGatesIntegrationRepairPromptOptions
): string =>
  [
    ...buildPhaseEnvelope(
      "Core opens Phase 3 Quality Gates Integration Repair."
    ),
    `Core rejected Quality Gates integration attempt ${options.attemptNumber}.`,
    "",
    ...(options.rejectedCommitHash
      ? [
          "The safe attempt was committed as workflow history:",
          `- ${options.rejectedCommitHash}`,
          "",
        ]
      : []),
    "Diagnostics:",
    ...formatDiagnostics(options.diagnostics, { phase: "integration" }),
    "",
    "Repair the Quality Gates integration within the current accepted contract scope.",
    "Change only the contract artifacts and accepted gate infrastructure.",
    "If a diagnostic mentions a generated build artifact, delete that file and change the responsible command so future build output is written outside the workspace root.",
    "Do not run Git commands or edit managed plan files.",
    "When the repair is ready, stop with a content-readiness note for Core validation. Do not claim the Quality Gates step is complete; Core must open Phase 4 Formal Quality Gates Verification first.",
  ].join("\n");

export const buildQualityGatesVerificationRepairPrompt = (
  options: QualityGatesIntegrationRepairPromptOptions
): string =>
  [
    ...buildPhaseEnvelope(
      "Core opens Phase 4 Quality Gates Verification Repair."
    ),
    `Core rejected Quality Gates formal verification attempt ${options.attemptNumber}.`,
    "",
    ...(options.rejectedCommitHash
      ? [
          "The safe attempt was committed as workflow history:",
          `- ${options.rejectedCommitHash}`,
          "",
        ]
      : []),
    "Diagnostics:",
    ...formatDiagnostics(options.diagnostics, { phase: "verification" }),
    "",
    ...buildVerificationEvidenceRepairContract(options.diagnostics),
    "",
    "Repair the Quality Gates verification evidence within the already accepted and integrated contract scope.",
    "Run the required formal verification commands and record exact passing evidence in the Quality Gates artifacts.",
    "Do not run Git commands or edit managed plan files.",
    "When the repair is ready, stop with a content-readiness note for Core validation. Do not claim the Quality Gates step is complete; Core must open Phase 5 Persistent Quality Gates User Return first.",
  ].join("\n");

export const buildQualityGatesReviewRevisionPrompt = (options: {
  readonly userFeedback: string;
  readonly workspaceSlug: string;
}): string =>
  [
    ...buildPhaseEnvelope(
      "Core opens Phase 2 Quality Gates Contract Revision."
    ),
    "Core received Quality Gates review corrections from the user.",
    "Revise only the Quality Gates contract artifacts and then stop for Core validation.",
    "",
    "Target artifacts:",
    ...buildContractArtifactPaths(options.workspaceSlug).map(
      (artifactPath) => `- \`${artifactPath}\``
    ),
    "",
    "User requested changes:",
    options.userFeedback.trim(),
    "",
    "Do not set `accepted: true`.",
    "Do not set `integrated: true`.",
    "If corrections affect tool selection, update the research artifacts and then the contract artifacts in the same revision.",
    "Do not create package scripts, configs, hooks, CI files, gate scripts, Development Tree artifacts, or production code.",
    "Do not run Git commands or edit managed plan files.",
  ].join("\n");

export const buildQualityGatesResearchReviewRevisionPrompt = (options: {
  readonly userFeedback: string;
  readonly workspaceSlug: string;
}): string =>
  [
    ...buildPhaseEnvelope(
      "Core opens Phase 1 Quality Gates Research Revision."
    ),
    "Core received Quality Gates research review corrections from the user.",
    "Revise only the Quality Gates research artifacts and then stop for Core validation.",
    "",
    "Target artifacts:",
    `- \`.codeai-hub/${options.workspaceSlug}/quality_gates/quality-gates-research.md\``,
    `- \`.codeai-hub/${options.workspaceSlug}/quality_gates/quality-gates-research.json\``,
    "",
    "User requested changes:",
    options.userFeedback.trim(),
    "",
    "Do not create `quality-gates.md` or `quality-gates.json` until Core explicitly opens contract drafting.",
    "Do not create package scripts, configs, hooks, CI files, gate scripts, Development Tree artifacts, or production code.",
    "Do not run Git commands or edit managed plan files.",
  ].join("\n");

export const buildQualityGatesBoundaryBlockedMessage = (
  details: string
): string =>
  [
    "Core paused the `Quality Gates Baseline` step on a plan-state boundary.",
    "",
    `Reason: ${explainBoundaryDetails(details)}`,
    "",
    "The input is released. Send any message and Core will re-validate the stage and repair the managed plan from the current Git state.",
  ].join("\n");

export const buildQualityGatesPersistentReturnMessage = (): string =>
  [
    "Core accepted Quality Gates formal verification.",
    "",
    "The gate baseline has been integrated, formal enforcement checks passed, and the result was recorded in Git. The Quality Gates step is complete, and a persistent return phase is open for later corrections.",
    "",
    "The input field is available for future Quality Gates changes. If no changes are needed now, continue to the next workflow step.",
  ].join("\n");
