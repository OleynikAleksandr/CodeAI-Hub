import path from "node:path";
import {
  buildDescriptionContract,
  buildDiagramModulesContract,
  buildVirtualSimulationContract,
} from "./idea-contract-service";
import type { DocumentationRolloverContext } from "./session-request-handler-documentation-rollover-state";

const STAGE_FILE_NAMES: Record<string, string> = {
  description: "Final_Description.md",
  virtual_simulation: "virtual-simulation.md",
  diagram_modules: "product-parts.index.md",
  application_skeleton: "application-skeleton-map.json",
  quality_gates: "quality-gates.json",
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

const buildRelativePath = (context: DocumentationRolloverContext): string => {
  const fileName = STAGE_FILE_NAMES[context.stageId] ?? "artifact.md";
  const runSegment =
    context.stageId !== "description" && context.runSlug
      ? `runs/${context.runSlug}/`
      : "";
  return `.codeai-hub/${context.workspaceSlug}/${context.stageId}/${runSegment}${fileName}`;
};

const buildInputLines = (
  context: DocumentationRolloverContext
): readonly string[] => {
  const descriptionPath = `.codeai-hub/${context.workspaceSlug}/description/Final_Description.md`;
  const simulationPath = `.codeai-hub/${context.workspaceSlug}/virtual_simulation/virtual-simulation.md`;
  if (context.stageId === "virtual_simulation") {
    return [`Final_Description.md: \`${descriptionPath}\``];
  }
  if (context.stageId === "diagram_modules") {
    return [
      `Final_Description.md: \`${descriptionPath}\``,
      `virtual-simulation.md: \`${simulationPath}\``,
      `Product Part files: \`.codeai-hub/${context.workspaceSlug}/diagram_modules/product-parts/<part-id>.md\``,
      `Layout sidecar: \`.codeai-hub/${context.workspaceSlug}/diagram_modules/module-map.flow.json\``,
    ];
  }
  if (context.stageId === "application_skeleton") {
    return [
      `Diagram Modules artifacts: \`.codeai-hub/${context.workspaceSlug}/diagram_modules/product-parts.index.md\` and \`.codeai-hub/${context.workspaceSlug}/diagram_modules/product-parts/<part-id>.md\``,
      `Application Skeleton artifacts: \`.codeai-hub/${context.workspaceSlug}/application_skeleton/application-skeleton.md\` and \`.codeai-hub/${context.workspaceSlug}/application_skeleton/application-skeleton-map.json\``,
    ];
  }
  if (context.stageId === "quality_gates") {
    return [
      `Application Skeleton artifacts: \`.codeai-hub/${context.workspaceSlug}/application_skeleton/application-skeleton.md\` and \`.codeai-hub/${context.workspaceSlug}/application_skeleton/application-skeleton-map.json\``,
      `Quality Gates artifacts: \`.codeai-hub/${context.workspaceSlug}/quality_gates/quality-gates.md\` and \`.codeai-hub/${context.workspaceSlug}/quality_gates/quality-gates.json\``,
    ];
  }
  return [
    "Use the existing source/questionnaire context already represented by the workflow artifacts.",
  ];
};

const buildManagedWorkspaceRecoveryBlock = (
  context: DocumentationRolloverContext
): string | null => {
  if (!MANAGED_WORKSPACE_STAGES.has(context.stageId)) {
    return null;
  }
  return [
    "## Managed Workspace Recovery",
    "- This filesystem stage resumes from the managed workspace control plane, not from legacy continuity reports.",
    "- First read `doc/TODO/workspace.plan.md`, then read the active child plan named by `activePlanPath`.",
    "- Run `npm run plan:status` and continue the current task/expected commit reported by the plan.",
    "- Use `.codeai-hub/workflow/revisions/` as the workflow revision ledger when downstream impact or recovery context is needed.",
    "- Do not search for legacy recovery reports and do not create a legacy root todo plan.",
  ].join("\n");
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
  context: DocumentationRolloverContext
): Promise<string> => {
  const relativePath = buildRelativePath(context);
  const absolutePath = path.join(context.workspacePath, relativePath);
  const fileName =
    STAGE_FILE_NAMES[context.stageId] ?? path.basename(relativePath);
  return [
    await resolveContractPrompt(context.stageId),
    "## Workflow Start / Step Contract Context",
    `Stage: ${STAGE_LABELS[context.stageId] ?? context.stageId}.`,
    `Target path (relative): \`${relativePath}\``,
    `Target path (absolute): \`${absolutePath}\``,
    ...buildInputLines(context),
    `Output file name: \`${fileName}\``,
  ].join("\n\n");
};

export const buildDocumentationContinuationEnvelope = async (options: {
  readonly context: DocumentationRolloverContext | null;
  readonly userMessage: string;
}): Promise<string> => {
  if (!options.context) {
    return options.userMessage;
  }
  const managedRecoveryBlock = buildManagedWorkspaceRecoveryBlock(
    options.context
  );
  return [
    await buildWorkflowStartContract(options.context),
    "## Continuation Mode",
    "- This is a continuation of the same Documentation Tree stage after context rollover, not a cold start.",
    "- Use the existing canonical workflow artifacts as the authoritative current state.",
    "- Do not create, read, or update continuity report files.",
    managedRecoveryBlock,
    "- The previous provider session ended after the assistant message below.",
    "- The user's message after this block is the user's answer or next instruction in response to that assistant message.",
    "## Last Assistant Message Before Rollover",
    options.context.lastUserVisibleAssistantMessage ??
      "(No user-visible assistant message was captured.)",
    "## User Message",
    options.userMessage,
  ].join("\n\n");
};
