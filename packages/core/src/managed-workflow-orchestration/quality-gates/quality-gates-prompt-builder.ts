export interface QualityGatesRepairPromptOptions {
  readonly diagnostics: readonly string[];
  readonly workspaceSlug: string;
}

export interface QualityGatesIntegrationRepairPromptOptions
  extends QualityGatesRepairPromptOptions {
  readonly attemptNumber: number;
  readonly rejectedCommitHash?: string | null;
}

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

const explainDiagnostic = (diagnostic: string): string => {
  if (diagnostic.startsWith("json_parse_error:")) {
    return `Fix \`quality-gates.json\`; it is not valid JSON. Parser detail: ${diagnostic
      .replace("json_parse_error:", "")
      .trim()}`;
  }
  if (diagnostic.startsWith("missing_package_script:")) {
    const gateId = diagnostic.replace("missing_package_script:", "").trim();
    return `Create a package.json script for required Quality Gate \`${gateId}\` and keep it aligned with \`quality-gates.json\`.`;
  }
  if (diagnostic.startsWith("missing_hook_gate:")) {
    const details = diagnostic.replace("missing_hook_gate:", "").trim();
    return `Wire the required Quality Gate directly into the lifecycle hook: ${details}.`;
  }
  if (diagnostic.startsWith("missing_required_command:")) {
    const gateId = diagnostic.replace("missing_required_command:", "").trim();
    return `Add command entry \`${gateId}\` to \`quality-gates.json.commands\` before listing it in required gate arrays.`;
  }
  if (diagnostic.startsWith("not_integrated_required_gate:")) {
    const gateId = diagnostic
      .replace("not_integrated_required_gate:", "")
      .trim();
    return `Gate \`${gateId}\` is required while unavailable. Either integrate it now or keep it in \`plannedRequiredAfterIntegration\` with concrete planned paths.`;
  }
  if (diagnostic.startsWith("required_gate_is_non_blocking:")) {
    const gateId = diagnostic
      .replace("required_gate_is_non_blocking:", "")
      .trim();
    return `Gate \`${gateId}\` is listed as required and non-blocking at the same time. In draft phase, keep it out of required arrays and list it only in \`plannedRequiredAfterIntegration\`; its command must remain \`desiredStatus: "active"\`, \`availability: "not_integrated"\`, and \`integrationRequired: true\`.`;
  }
  if (diagnostic.startsWith("planned_required_gate_non_active:")) {
    const gateId = diagnostic
      .replace("planned_required_gate_non_active:", "")
      .trim();
    return `Gate \`${gateId}\` is planned to become required after integration, so do not convert it to advisory or deferred. Set its command \`desiredStatus\` to \`"active"\`.`;
  }
  if (
    diagnostic.startsWith("planned_required_gate_not_integration_required:")
  ) {
    const gateId = diagnostic
      .replace("planned_required_gate_not_integration_required:", "")
      .trim();
    return `Gate \`${gateId}\` is planned required after integration, so keep \`integrationRequired: true\` and list concrete \`plannedIntegrationPaths\`.`;
  }
  if (diagnostic.startsWith("planned_required_gate_wrong_availability:")) {
    const gateId = diagnostic
      .replace("planned_required_gate_wrong_availability:", "")
      .trim();
    return `Gate \`${gateId}\` is not integrated yet but is planned required after integration. Set \`availability\` to \`"not_integrated"\`.`;
  }
  if (diagnostic.startsWith("planned_required_gate_missing_paths:")) {
    const gateId = diagnostic
      .replace("planned_required_gate_missing_paths:", "")
      .trim();
    return `Gate \`${gateId}\` is planned required after integration and must list concrete \`plannedIntegrationPaths\`.`;
  }
  const knownDiagnostics: Readonly<Record<string, string>> = {
    accepted_required_for_integration:
      "Set `accepted: true` only in the post-acceptance integration phase.",
    commands_array:
      "`quality-gates.json.commands` must be an object keyed by stable gate id, not an array.",
    commands_missing:
      "Add a non-empty `commands` object to `quality-gates.json`.",
    integrated_required:
      "Set `integrated: true` only after required package scripts and hook wiring exist.",
    integration_state_integrated_required:
      'Set `integrationState: "integrated"` only after the integration files are actually present.',
    json_root_not_object:
      "Make `quality-gates.json` a single JSON object at the root.",
    quality_gates_contract_before_research_review:
      "Remove `quality-gates.md` and `quality-gates.json` for this pass; Core must open the research report for user review before the contract draft is created.",
    markdown_premature_acceptance:
      "Remove draft-time acceptance from `quality-gates.md`; Core opens acceptance only after user review.",
    markdown_premature_integration:
      "Remove draft-time integration claims from `quality-gates.md`; integration is not open yet.",
    markdown_wrong_stage:
      "Set the first Markdown heading to exactly `# Quality Gates Baseline`.",
    missing_markdown:
      "Create `quality-gates.md` with the canonical Quality Gates Markdown contract.",
    missing_package_json:
      "Create or update `package.json` with exact scripts for required Quality Gates.",
    missing_quality_gates_research_json:
      "Create `quality-gates-research.json` with the required current-tooling research contract.",
    missing_quality_gates_research_markdown:
      "Create `quality-gates-research.md` as the user-facing research report before the gate contract.",
    missing_quality_gates_json:
      "Create `quality-gates.json` with the Quality Gates JSON contract.",
    premature_accepted_true:
      "Set the draft JSON lifecycle state to `accepted: false`; Core opens acceptance only after user review.",
    premature_integrated_true:
      "Set the draft JSON lifecycle state to `integrated: false`; integration is not open yet.",
    premature_integration_state:
      'Set the draft JSON lifecycle state to `integrationState: "not_started"`.',
    schema_invalid: 'Set `schema` to exactly `"codeai-quality-gates-v1"`.',
    research_schema_invalid:
      'Set `quality-gates-research.json.schema` to exactly `"codeai-quality-gates-research-v1"`.',
    research_markdown_missing_required_heading:
      "Start `quality-gates-research.md` with the exact heading `# Quality Gates Research` before any localized prose or sections.",
    research_sources_missing:
      "Add at least one current source to the research artifact.",
    research_recommendations_missing:
      "Add at least one sourced recommendation to the research artifact.",
    research_stackSummary_missing:
      "Add a concise `stackSummary` explaining the detected stack and why the research applies.",
    missing_required_size_policy_gate:
      'Add one required gate to `requiredBeforeCommit` or `requiredBeforePush` whose `commands.<gate-id>.policy` is exactly `{ "type": "source_size_limit", "maxLines": 500, "appliesTo": ["source_files", "classes"] }`. Keep its package script and hook call wired with the same gate id.',
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
    "Core accepted the Quality Gates research report and opens contract drafting.",
    "",
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
    "Core opens Phase 3 Quality Gates Integration.",
    "",
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
    "",
    "Required lifecycle state after successful integration:",
    "- `accepted: true`",
    "- `integrated: true`",
    '- `integrationState: "integrated"`',
    "",
    "Every gate listed in `requiredBeforeCommit` or `requiredBeforePush` must have a package script and a direct hook call.",
    "Do not run Git commands or edit managed plan files.",
    "When integration is ready, stop with a content-readiness note for Core validation.",
  ].join("\n");

export const buildQualityGatesIntegrationRepairPrompt = (
  options: QualityGatesIntegrationRepairPromptOptions
): string =>
  [
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
    ...formatDiagnostics(options.diagnostics),
    "",
    "Repair the Quality Gates integration within the current accepted contract scope.",
    "Change only the contract artifacts and accepted gate infrastructure.",
    "Do not run Git commands or edit managed plan files.",
    "When the repair is ready, stop with a content-readiness note for Core validation.",
  ].join("\n");

export const buildQualityGatesReviewRevisionPrompt = (options: {
  readonly userFeedback: string;
  readonly workspaceSlug: string;
}): string =>
  [
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
    "CodeAI Core cannot continue the `Quality Gates Baseline` step yet.",
    "",
    `Reason: ${explainBoundaryDetails(details)}`,
    "",
    "This is an orchestrator plan-state problem, not an agent artifact problem. Do not ask Project Manager or the agent to bypass it.",
    "Core must repair the managed stage plan or finish the blocked Git commit boundary, then retry Quality Gates validation.",
  ].join("\n");

export const buildQualityGatesPersistentReturnMessage = (): string =>
  [
    "Core accepted Quality Gates integration.",
    "",
    "The gate baseline has been integrated, lifecycle hooks were checked, and the result was recorded in Git. The Quality Gates step is complete, and a persistent return phase is open for later corrections.",
    "",
    "The input field is available for future Quality Gates changes. If no changes are needed now, continue to the next workflow step.",
  ].join("\n");
