import { readFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowState } from "../state/workflow-state-types";

const normalizeArtifactPath = (value: string): string =>
  value.replace(/\\/g, "/").trim();

const resolveLatestArtifactPath = (params: {
  readonly state: WorkflowState;
  readonly stage: "virtual_simulation";
  readonly fileName: "virtual-simulation.md";
}): string | null => {
  const artifacts = params.state.stages[params.stage].artifacts;
  let best: { readonly updatedAt: string; readonly path: string } | null = null;
  for (const artifact of artifacts) {
    const normalized = normalizeArtifactPath(artifact.path);
    if (!normalized.endsWith(`/${params.fileName}`)) {
      continue;
    }
    if (!best || artifact.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { updatedAt: artifact.updatedAt, path: artifact.path };
    }
  }
  return best?.path ?? null;
};

const VIRTUAL_SIMULATION_TITLE_RE = /^#\s+Virtual Simulation:/m;
const VIRTUAL_SIMULATION_SCENARIO_RE = /^##\s+(?:Сценарий|Scenario)\s+\d+\b/gm;

export const validateVirtualSimulationMarkdown = (
  content: string
): string | null => {
  if (content.trim().length === 0) {
    return "virtual-simulation markdown is empty";
  }
  if (!VIRTUAL_SIMULATION_TITLE_RE.test(content)) {
    return "virtual-simulation markdown is missing '# Virtual Simulation' header";
  }
  const scenarioMatches = content.match(VIRTUAL_SIMULATION_SCENARIO_RE);
  const scenarioCount = scenarioMatches?.length ?? 0;
  if (scenarioCount < 2) {
    return "virtual-simulation markdown must include at least 2 scenarios (## Сценарий N)";
  }
  if (scenarioCount > 4) {
    return "virtual-simulation markdown must include at most 4 scenarios";
  }
  return null;
};

export const applyVirtualSimulationValidation = async (params: {
  readonly state: WorkflowState;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowState> => {
  const stage = "virtual_simulation";
  const fileName = "virtual-simulation.md";
  const latestArtifactPath = resolveLatestArtifactPath({
    state: params.state,
    stage,
    fileName,
  });
  if (!latestArtifactPath) {
    return params.state;
  }

  const absolutePath = path.resolve(
    params.workspaceRoot,
    ".codeai-hub",
    params.workspaceSlug,
    latestArtifactPath
  );

  let content = "";
  try {
    content = await readFile(absolutePath, "utf8");
  } catch {
    const stageState = params.state.stages[stage];
    const nextArtifacts = stageState.artifacts.filter(
      (artifact) =>
        !normalizeArtifactPath(artifact.path).endsWith(`/${fileName}`)
    );
    return {
      ...params.state,
      stages: {
        ...params.state.stages,
        [stage]: { ...stageState, status: "idle", artifacts: nextArtifacts },
      },
    };
  }

  const validationError = validateVirtualSimulationMarkdown(content);
  if (!validationError) {
    return params.state;
  }

  const stageState = params.state.stages[stage];
  const validationGate = {
    gateId: "virtual-simulation.validation",
    status: "failed" as const,
    updatedAt: new Date().toISOString(),
    stage,
    detail: validationError,
  };

  return {
    ...params.state,
    stages: {
      ...params.state.stages,
      [stage]: {
        ...stageState,
        status: "invalid",
        gates: [
          ...stageState.gates.filter(
            (gate) => gate.gateId !== validationGate.gateId
          ),
          validationGate,
        ],
      },
    },
  };
};
