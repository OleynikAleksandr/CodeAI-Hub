import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentationRolloverContext } from "./session-request-handler-documentation-rollover-state";

const ACTIVE_PLAN_STATE_END = "<!-- codeai-plan-state:end -->";
const ACTIVE_PLAN_STATE_START = "<!-- codeai-plan-state:start -->";
const JSON_FENCE_END_RE = /\s*```$/u;
const JSON_FENCE_START_RE = /^```json\s*/u;
const MARKDOWN_EXTENSION_RE = /\.md$/u;
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const WORKSPACE_PLAN_STATE_END = "<!-- codeai-workspace-plan-state:end -->";
const WORKSPACE_PLAN_STATE_START = "<!-- codeai-workspace-plan-state:start -->";

const DEFAULT_STAGE_PLAN_PATHS: Readonly<Record<string, string>> = {
  application_skeleton: "doc/TODO/stages/application-skeleton/todo-plan.md",
  diagram_modules: "doc/TODO/stages/diagram-modules/todo-plan.md",
  quality_gates: "doc/TODO/stages/quality-gates/todo-plan.md",
};

interface SourceDescriptor {
  readonly label: string;
  readonly relativePath: string;
}

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly executionScopeStatus: string | null;
  readonly expectedCommitMessage: string | null;
  readonly lastRecordedCommit: string | null;
}

interface WorkspacePlanState {
  readonly acceptedCommits: readonly unknown[];
  readonly activePlanPath: string | null;
  readonly activeStage: string | null;
}

export interface ManagedContextBundle {
  readonly activePlanText: string | null;
  readonly planStatusText: string;
  readonly rendered: string;
  readonly sourceArtifactCount: number;
  readonly workspacePlanText: string | null;
}

export const buildManagedWorkflowContextBundle = async (
  context: DocumentationRolloverContext
): Promise<ManagedContextBundle | null> => {
  if (!(context.stageId in DEFAULT_STAGE_PLAN_PATHS)) {
    return null;
  }
  const workspacePlanText = await readText(
    path.join(context.workspacePath, WORKSPACE_PLAN_PATH)
  );
  const workspacePlanState = parseWorkspacePlanState(workspacePlanText);
  const activePlanPath =
    workspacePlanState.activePlanPath ??
    DEFAULT_STAGE_PLAN_PATHS[context.stageId] ??
    null;
  const activePlanText = activePlanPath
    ? await readText(path.join(context.workspacePath, activePlanPath))
    : null;
  const activePlanState = parseActivePlanState(activePlanText);
  const sourceArtifacts = await readSourceArtifacts(context);
  const planStatusText = renderPlanStatus({
    activePlanPath,
    activePlanState,
    workspacePlanState,
  });
  const rendered = renderBundle({
    activePlanText,
    context,
    planStatusText,
    sourceArtifacts,
    workspacePlanText,
  });
  return {
    activePlanText,
    planStatusText,
    rendered,
    sourceArtifactCount: sourceArtifacts.length,
    workspacePlanText,
  };
};

const renderBundle = (params: {
  readonly activePlanText: string | null;
  readonly context: DocumentationRolloverContext;
  readonly planStatusText: string;
  readonly sourceArtifacts: readonly {
    readonly label: string;
    readonly text: string;
  }[];
  readonly workspacePlanText: string | null;
}): string =>
  [
    "## Managed Workflow Context Bundle",
    "Core embedded the current managed-workflow context below. Do not reread input documents by path unless Core explicitly marks this bundle as truncated or stale.",
    `Stage: ${params.context.stageId}`,
    `Current provider: ${params.context.providerId}`,
    renderSourceArtifacts(params.sourceArtifacts),
    renderTextBlock("Workspace Plan Text", params.workspacePlanText),
    renderTextBlock("Active Stage Todo Plan Text", params.activePlanText),
    renderTextBlock("Plan Status", params.planStatusText),
  ]
    .filter(Boolean)
    .join("\n\n");

const renderSourceArtifacts = (
  artifacts: readonly { readonly label: string; readonly text: string }[]
): string => {
  if (artifacts.length === 0) {
    return "## Embedded Source Artifacts\n(none found)";
  }
  const blocks = artifacts.map((artifact) =>
    renderTextBlock(`Source Artifact: ${artifact.label}`, artifact.text)
  );
  return ["## Embedded Source Artifacts", ...blocks].join("\n\n");
};

const renderTextBlock = (title: string, text: string | null): string =>
  [`## ${title}`, "```markdown", text?.trim() || "(not available)", "```"].join(
    "\n"
  );

const renderPlanStatus = (params: {
  readonly activePlanPath: string | null;
  readonly activePlanState: ManagedPlanState;
  readonly workspacePlanState: WorkspacePlanState;
}): string =>
  [
    `activeStage: ${JSON.stringify(params.workspacePlanState.activeStage ?? null)}`,
    `activePlanPath: ${JSON.stringify(params.activePlanPath ?? null)}`,
    `Execution scope status: ${params.activePlanState.executionScopeStatus ?? "unknown"}`,
    `Current task: ${params.activePlanState.currentTaskId ?? "none"}`,
    `Expected commit: ${params.activePlanState.expectedCommitMessage ?? "none"}`,
    `Last recorded commit: ${params.activePlanState.lastRecordedCommit ?? "none"}`,
    `Accepted commits recorded: ${params.workspacePlanState.acceptedCommits.length}`,
  ].join("\n");

const readSourceArtifacts = async (
  context: DocumentationRolloverContext
): Promise<readonly { readonly label: string; readonly text: string }[]> => {
  const descriptors = await listSourceDescriptors(context);
  const artifacts = await Promise.all(
    descriptors.map(async (descriptor) => ({
      label: descriptor.label,
      text: await readText(
        path.join(context.workspacePath, descriptor.relativePath)
      ),
    }))
  );
  return artifacts.filter(
    (artifact): artifact is { readonly label: string; readonly text: string } =>
      artifact.text !== null
  );
};

const listSourceDescriptors = async (
  context: DocumentationRolloverContext
): Promise<readonly SourceDescriptor[]> => {
  const slugRoot = `.codeai-hub/${context.workspaceSlug}`;
  if (context.stageId === "diagram_modules") {
    return [
      {
        label: "Final_Description.md",
        relativePath: `${slugRoot}/description/Final_Description.md`,
      },
      {
        label: "virtual-simulation.md",
        relativePath: `${slugRoot}/virtual_simulation/virtual-simulation.md`,
      },
      {
        label: "product-parts.index.md",
        relativePath: `${slugRoot}/diagram_modules/product-parts.index.md`,
      },
      ...(await listProductPartDescriptors(context)),
    ];
  }
  if (context.stageId === "application_skeleton") {
    return [
      {
        label: "Final_Description.md",
        relativePath: `${slugRoot}/description/Final_Description.md`,
      },
      {
        label: "virtual-simulation.md",
        relativePath: `${slugRoot}/virtual_simulation/virtual-simulation.md`,
      },
      {
        label: "product-parts.index.md",
        relativePath: `${slugRoot}/diagram_modules/product-parts.index.md`,
      },
      ...(await listProductPartDescriptors(context)),
    ];
  }
  if (context.stageId === "quality_gates") {
    return [
      {
        label: "application-skeleton.md",
        relativePath: `${slugRoot}/application_skeleton/application-skeleton.md`,
      },
      {
        label: "application-skeleton-map.json",
        relativePath: `${slugRoot}/application_skeleton/application-skeleton-map.json`,
      },
      {
        label: "quality-gates.md",
        relativePath: `${slugRoot}/quality_gates/quality-gates.md`,
      },
      {
        label: "quality-gates.json",
        relativePath: `${slugRoot}/quality_gates/quality-gates.json`,
      },
    ];
  }
  return [];
};

const listProductPartDescriptors = async (
  context: DocumentationRolloverContext
): Promise<readonly SourceDescriptor[]> => {
  const relativeDir = `.codeai-hub/${context.workspaceSlug}/diagram_modules/product-parts`;
  const absoluteDir = path.join(context.workspacePath, relativeDir);
  try {
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => ({
        label: `Product Part: ${entry.name.replace(MARKDOWN_EXTENSION_RE, "")}`,
        relativePath: `${relativeDir}/${entry.name}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  } catch {
    return [];
  }
};

const parseWorkspacePlanState = (text: string | null): WorkspacePlanState => {
  const state = parseJsonBlock(text, {
    end: WORKSPACE_PLAN_STATE_END,
    start: WORKSPACE_PLAN_STATE_START,
  });
  return {
    acceptedCommits: Array.isArray(state?.acceptedCommits)
      ? state.acceptedCommits
      : [],
    activePlanPath:
      typeof state?.activePlanPath === "string" ? state.activePlanPath : null,
    activeStage:
      typeof state?.activeStage === "string" ? state.activeStage : null,
  };
};

const parseActivePlanState = (text: string | null): ManagedPlanState => {
  const state = parseJsonBlock(text, {
    end: ACTIVE_PLAN_STATE_END,
    start: ACTIVE_PLAN_STATE_START,
  });
  return {
    currentTaskId:
      typeof state?.currentTaskId === "string" ? state.currentTaskId : null,
    executionScopeStatus:
      typeof state?.executionScopeStatus === "string"
        ? state.executionScopeStatus
        : null,
    expectedCommitMessage:
      typeof state?.expectedCommitMessage === "string"
        ? state.expectedCommitMessage
        : null,
    lastRecordedCommit:
      typeof state?.lastRecordedCommit === "string"
        ? state.lastRecordedCommit
        : null,
  };
};

const parseJsonBlock = (
  text: string | null,
  markers: { readonly end: string; readonly start: string }
): Record<string, unknown> | null => {
  const raw = text?.split(markers.start)[1]?.split(markers.end)[0];
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const stripJsonFence = (value: string): string =>
  value
    .trim()
    .replace(JSON_FENCE_START_RE, "")
    .replace(JSON_FENCE_END_RE, "")
    .trim();

const readText = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};
