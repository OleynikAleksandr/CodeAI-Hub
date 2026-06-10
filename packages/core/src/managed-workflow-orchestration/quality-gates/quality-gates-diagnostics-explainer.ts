const splitGateDiagnostic = (
  diagnostic: string,
  prefix: string
): readonly [string, string] => {
  const rest = diagnostic.replace(prefix, "");
  const separatorIndex = rest.indexOf(":");
  return [
    rest.slice(0, separatorIndex).trim(),
    rest.slice(separatorIndex + 1).trim(),
  ];
};

const explainDiagnostic = (
  diagnostic: string,
  options: { readonly phase?: "draft" | "integration" | "verification" } = {}
): string => {
  if (diagnostic.startsWith("json_parse_error:")) {
    return `Fix \`quality-gates.json\`; it is not valid JSON. Parser detail: ${diagnostic
      .replace("json_parse_error:", "")
      .trim()}`;
  }
  if (diagnostic.startsWith("gate_command_missing:")) {
    const gateId = diagnostic.replace("gate_command_missing:", "").trim();
    return `Required Quality Gate \`${gateId}\` has no executable command. Set \`commands.${gateId}.proposedCommand\` in \`quality-gates.json\` to the command that runs this gate; the command name is your choice.`;
  }
  if (diagnostic.startsWith("gate_command_unresolved:")) {
    const [gateId, command] = splitGateDiagnostic(
      diagnostic,
      "gate_command_unresolved:"
    );
    return `The command of gate \`${gateId}\` (\`${command}\`) references a package script that does not exist. Create that script in \`package.json\` (any name works) or point the gate command at one that exists.`;
  }
  if (diagnostic.startsWith("gate_command_not_reachable:")) {
    const [gateId, details] = splitGateDiagnostic(
      diagnostic,
      "gate_command_not_reachable:"
    );
    return `The command of gate \`${gateId}\` is not reachable from its lifecycle hook (${details}). Call it from the hook directly or through any package script chain the hook already runs; aggregate scripts are fine.`;
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
    if (options.phase === "integration") {
      return `Gate \`${gateId}\` is both required and still listed as planned/non-blocking during integration. If the gate has runner evidence, remove it from \`plannedRequiredAfterIntegration\`, keep it only in the appropriate required array, set \`availability: "executable"\`, and keep the matching runner evidence. If it should not affect future code yet, remove it from required arrays and enforcement hooks.`;
    }
    return `Gate \`${gateId}\` is listed as required and non-blocking at the same time. In draft phase, keep it out of required arrays and list it only in \`plannedRequiredAfterIntegration\`; its command must remain \`desiredStatus: "active"\`, \`availability: "not_integrated"\`, and \`integrationRequired: true\`.`;
  }
  if (
    diagnostic.startsWith("planned_gate_has_runner_evidence_after_integration:")
  ) {
    const [, gateId = "", evidence = ""] = diagnostic.split(":");
    return `Gate \`${gateId}\` is still listed as planned/not_integrated, but Core found integration runner evidence after Phase 3 (${evidence}). Promote it to the required executable state if it affects future code, or remove that runner evidence if it is truly future-only.`;
  }
  if (diagnostic.startsWith("missing_verification_command_evidence:")) {
    const command = diagnostic
      .replace("missing_verification_command_evidence:", "")
      .trim();
    return `Core did not find passed formal verification evidence for \`${command}\` in \`quality-gates.json\`. Record it under \`verificationEvidence.commands[]\` as \`{ "sequence": 1, "command": "${command}", "status": "passed", "exitCode": 0 }\` and set \`verificationEvidence.executionMode: "sequential"\`. Core also accepts \`verificationEvidence.commandRuns[]\`, \`verificationEvidence.verificationCommandEvidence[]\`, and \`verificationEvidence.commandEvidence["${command}"]\` when they carry the same sequential execution metadata, but \`verificationEvidence.commands[]\` is the preferred repair target.`;
  }
  if (diagnostic === "missing_sequential_verification_evidence") {
    return 'Formal verification evidence must prove a sequential workspace transaction. Run the required commands one at a time, then record `verificationEvidence.executionMode: "sequential"` and a positive integer `sequence` on every command evidence entry before setting `verificationState: "verified"`.';
  }
  if (diagnostic.startsWith("verification_command_not_passed:")) {
    const [, command = "", status = "unknown"] = diagnostic.split(":");
    return `Core found formal verification evidence for \`${command}\`, but its status is \`${status}\` instead of \`passed\`. Re-run the command sequentially, fix any failure, then record \`status: "passed"\`, \`exitCode: 0\`, and its \`sequence\` number.`;
  }
  if (diagnostic.startsWith("verification_state_not_verified:")) {
    const state = diagnostic
      .replace("verification_state_not_verified:", "")
      .trim();
    return `Set \`verificationState: "verified"\` only after the required aggregate commands and Husky hook scripts have passed. Current recorded state is \`${state}\`.`;
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
      'Add one required gate to `requiredBeforeCommit` or `requiredBeforePush` whose `commands.<gate-id>.policy` is exactly `{ "type": "source_size_limit", "maxLines": 500, "appliesTo": ["source_files", "classes"] }`. Wire its command into the matching lifecycle hook directly or through an aggregate script.',
    missing_verification_evidence:
      'Record formal verification evidence in `quality-gates.json`. Preferred shape: `{ "verificationState": "verified", "verificationEvidence": { "executionMode": "sequential", "commands": [{ "sequence": 1, "command": "sh .husky/pre-commit", "status": "passed", "exitCode": 0 }] } }`.',
    missing_verification_state:
      'Set `verificationState: "verified"` in `quality-gates.json` only after the required formal verification commands and Husky hook scripts pass sequentially.',
  };
  return knownDiagnostics[diagnostic] ?? diagnostic;
};

const extractMissingVerificationCommand = (
  diagnostic: string
): string | null =>
  diagnostic.startsWith("missing_verification_command_evidence:")
    ? diagnostic.replace("missing_verification_command_evidence:", "").trim()
    : null;

export const buildVerificationEvidenceRepairContract = (
  diagnostics: readonly string[]
): readonly string[] => {
  const commands = diagnostics
    .map(extractMissingVerificationCommand)
    .filter((command): command is string => Boolean(command));
  const commandEntries =
    commands.length > 0
      ? commands.map((command, index) => ({
          command,
          exitCode: 0,
          sequence: index + 1,
          status: "passed",
        }))
      : [
          {
            command: "npm run qg:before-commit",
            exitCode: 0,
            sequence: 1,
            status: "passed",
          },
        ];
  return [
    "Core verification evidence read contract:",
    "- Source of truth: `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json`.",
    "- Preferred repair path: `verificationEvidence.commands[]`.",
    '- Required execution marker: `verificationEvidence.executionMode` must be `"sequential"`.',
    '- Every command evidence entry must include a positive integer `sequence`, `status: "passed"`, and `exitCode: 0`.',
    "- Also accepted: `verificationEvidence.commandRuns[]`, `verificationEvidence.verificationCommandEvidence[]`, and `verificationEvidence.commandEvidence[command]` when they carry the same sequential metadata.",
    "- Do not rely on `.codeai-hub/<workspaceSlug>/workflow/managed/quality_gates.json`; Core validates the canonical Quality Gates artifact.",
    "- If evidence was already recorded in another shape, duplicate the passing entries into `verificationEvidence.commands[]` instead of adding new field names.",
    "",
    "Minimal accepted JSON shape for this repair:",
    "```json",
    JSON.stringify(
      {
        verificationEvidence: {
          commands: commandEntries,
          executionMode: "sequential",
        },
        verificationState: "verified",
      },
      null,
      2
    ),
    "```",
  ];
};

export const formatDiagnostics = (
  diagnostics: readonly string[],
  options: { readonly phase?: "draft" | "integration" | "verification" } = {}
): readonly string[] =>
  diagnostics.length > 0
    ? diagnostics.map(
        (diagnostic) => `- ${explainDiagnostic(diagnostic, options)}`
      )
    : ["- Core validation did not provide a detailed diagnostic."];
