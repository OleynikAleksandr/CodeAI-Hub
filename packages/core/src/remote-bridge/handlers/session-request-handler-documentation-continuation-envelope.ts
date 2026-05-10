import {
  buildDescriptionContract,
  buildDiagramModulesContract,
  buildVirtualSimulationContract,
} from "./idea-contract-service";
import type { DocumentationRolloverContext } from "./session-request-handler-documentation-rollover-state";
import { buildManagedWorkflowContextBundle } from "./session-request-handler-managed-context-bundle";

const STAGE_FILE_NAMES: Record<string, string> = {
  description: "Final_Description.md",
  virtual_simulation: "virtual-simulation.md",
  diagram_modules: "product-parts.index.md",
  application_skeleton: "application-skeleton.md",
  quality_gates: "quality-gates.md",
};

const STAGE_LABELS: Record<string, string> = {
  description: "Description",
  virtual_simulation: "Virtual Simulation",
  diagram_modules: "Diagram Modules",
  application_skeleton: "Application Skeleton",
  quality_gates: "Quality Gates",
};

const MANAGED_WORKSPACE_STAGES = new Set([
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
]);

const buildStageOutputTargets = (
  context: DocumentationRolloverContext
): readonly string[] => {
  const root = `.codeai-hub/${context.workspaceSlug}`;
  if (context.stageId === "description") {
    return [`${root}/description/Final_Description.md`];
  }
  if (context.stageId === "virtual_simulation") {
    return [`${root}/virtual_simulation/virtual-simulation.md`];
  }
  if (context.stageId === "diagram_modules") {
    return [
      `${root}/diagram_modules/product-parts.index.md`,
      `${root}/diagram_modules/product-parts/<part-id>.md`,
    ];
  }
  if (context.stageId === "application_skeleton") {
    return [
      `${root}/application_skeleton/application-skeleton.md`,
      `${root}/application_skeleton/application-skeleton-map.json`,
    ];
  }
  if (context.stageId === "quality_gates") {
    return [
      `${root}/quality_gates/quality-gates.md`,
      `${root}/quality_gates/quality-gates.json`,
    ];
  }
  return [];
};

const buildOutputTargetLines = (
  context: DocumentationRolloverContext
): readonly string[] => {
  const targets = buildStageOutputTargets(context);
  if (targets.length === 0) {
    return [];
  }
  if (!MANAGED_WORKSPACE_STAGES.has(context.stageId)) {
    return [
      `Output target artifact (write exactly this relative path; do not read it first): \`${targets[0]}\``,
    ];
  }
  return [
    "Managed output target rule: write only the current target path named by Core or by the Active Stage Todo Plan Text; do not infer or expand scope from sibling files.",
    "Canonical output path(s) for this stage:",
    ...targets.map((target) => `- \`${target}\``),
  ];
};

const buildInputLines = (
  context: DocumentationRolloverContext
): readonly string[] => {
  if (MANAGED_WORKSPACE_STAGES.has(context.stageId)) {
    return [
      "Input documents and managed workflow state are embedded below by Core. Do not reread input documents by path unless Core marks the bundle as truncated or stale.",
    ];
  }
  if (context.stageId === "virtual_simulation") {
    return [
      "Use the embedded Final Description text from Core; do not reread it by path.",
    ];
  }
  return [
    "Use the existing source/questionnaire context already represented by the workflow artifacts.",
  ];
};

const resolveContractPrompt = async (stageId: string): Promise<string> => {
  let contract: { readonly prompt: string } | null = null;
  if (stageId === "description") {
    contract = await buildDescriptionContract();
  } else if (stageId === "virtual_simulation") {
    contract = await buildVirtualSimulationContract();
  } else if (stageId === "diagram_modules") {
    contract = await buildDiagramModulesContract();
  }
  return contract?.prompt.trim() || "Continue the current workflow artifact.";
};

const buildWorkflowStartContract = async (
  context: DocumentationRolloverContext,
  managedBundleText: string | null
): Promise<string> => {
  const fileName = STAGE_FILE_NAMES[context.stageId] ?? "artifact.md";
  return [
    await resolveContractPrompt(context.stageId),
    "## Workflow Start / Step Contract Context",
    `Stage: ${STAGE_LABELS[context.stageId] ?? context.stageId}.`,
    ...buildInputLines(context),
    `Output file name: \`${fileName}\``,
    ...buildOutputTargetLines(context),
    managedBundleText,
  ].join("\n\n");
};

const buildArtifactModeSection = (
  context: DocumentationRolloverContext
): readonly string[] => {
  if (!MANAGED_WORKSPACE_STAGES.has(context.stageId)) {
    return [];
  }
  return [
    "## Artifact Mode",
    "- artifact_mode: continue_active_microtask",
    "- Do NOT treat this turn as `create_initial_draft`.",
    "- Continue only the current managed microtask/target named in the Plan Status above; stop for Core acceptance once the readiness note is produced.",
  ];
};

export const buildDocumentationContinuationEnvelope = async (options: {
  readonly context: DocumentationRolloverContext | null;
  readonly userMessage: string;
}): Promise<string> => {
  if (!options.context) {
    return options.userMessage;
  }
  const managedBundle = await buildManagedWorkflowContextBundle(
    options.context
  );
  return [
    await buildWorkflowStartContract(
      options.context,
      managedBundle?.rendered ?? null
    ),
    "## Continuation Mode",
    "- This is a continuation of the same Documentation Tree stage after context rollover, not a cold start.",
    "- Use the embedded Core context bundle and canonical workflow artifacts as the authoritative current state.",
    "- Continue only the current managed microtask/target named by Core, then stop for Core acceptance.",
    "- Do not create, read, or update continuity report files.",
    "- Do not search for legacy recovery reports and do not create a legacy root todo plan.",
    "- The previous provider session ended after the assistant message below.",
    "- The user's message after this block is the user's answer or next instruction in response to that assistant message.",
    ...buildArtifactModeSection(options.context),
    "## Last Assistant Message Before Rollover",
    options.context.lastUserVisibleAssistantMessage ??
      "(No user-visible assistant message was captured.)",
    "## User Message",
    options.userMessage,
  ].join("\n\n");
};
