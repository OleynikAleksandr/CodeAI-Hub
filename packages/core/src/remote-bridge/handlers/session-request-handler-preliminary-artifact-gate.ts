import { access } from "node:fs/promises";
import path from "node:path";
import { buildManagedUserLedReviewHandoffMessage } from "../../managed-workflow-orchestration/managed-workflow-user-handoff-messages";

const VIRTUAL_SIMULATION_ARTIFACT_RELATIVE_PATH =
  "virtual_simulation/virtual-simulation.md";

type PreliminaryStage = "description" | "virtual_simulation";

export interface PreliminaryArtifactGateInput {
  readonly stage: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface PreliminaryArtifactGateResult {
  readonly content: string;
  readonly tag: "managed-workflow-user-review" | "managed-workflow-validation";
}

const buildMissingVirtualSimulationArtifactMessage = (
  workspaceSlug: string
): string =>
  [
    "Core cannot move Virtual Simulation to user review yet.",
    `The required artifact was not found: .codeai-hub/${workspaceSlug}/${VIRTUAL_SIMULATION_ARTIFACT_RELATIVE_PATH}`,
    "",
    "Ask the agent to write the canonical virtual-simulation.md artifact, or rerun Virtual Simulation before starting Diagram Modules.",
  ].join("\n");

const isPreliminaryStage = (stage: string): stage is PreliminaryStage =>
  stage === "description" || stage === "virtual_simulation";

const virtualSimulationArtifactExists = async (
  input: PreliminaryArtifactGateInput
): Promise<boolean> => {
  const artifactPath = path.join(
    input.workspaceRoot,
    ".codeai-hub",
    input.workspaceSlug,
    VIRTUAL_SIMULATION_ARTIFACT_RELATIVE_PATH
  );
  try {
    await access(artifactPath);
    return true;
  } catch {
    return false;
  }
};

export const resolvePreliminaryArtifactGate = async (
  input: PreliminaryArtifactGateInput
): Promise<PreliminaryArtifactGateResult | null> => {
  if (!isPreliminaryStage(input.stage)) {
    return null;
  }
  if (
    input.stage === "virtual_simulation" &&
    !(await virtualSimulationArtifactExists(input))
  ) {
    return {
      content: buildMissingVirtualSimulationArtifactMessage(
        input.workspaceSlug
      ),
      tag: "managed-workflow-validation",
    };
  }
  return {
    content: buildManagedUserLedReviewHandoffMessage(
      input.stage === "description" ? "Description" : "Virtual Simulation"
    ),
    tag: "managed-workflow-user-review",
  };
};
