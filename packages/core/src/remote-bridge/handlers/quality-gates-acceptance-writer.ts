import { readFile, writeFile } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";

export type QualityGatesAcceptanceWriteStatus =
  | "patched"
  | "noop"
  | "contract_missing"
  | "invalid_json"
  | "path_unresolved";

export interface QualityGatesAcceptanceWriteResult {
  readonly contractPath?: string;
  readonly status: QualityGatesAcceptanceWriteStatus;
}

const isAcceptedTerminalState = (json: Record<string, unknown>): boolean =>
  json.accepted === true;

export const writeQualityGatesAcceptance = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<QualityGatesAcceptanceWriteResult> => {
  const contractPathResult = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "quality_gates",
    fileName: "quality-gates.json",
  });
  if (!contractPathResult.ok) {
    return { status: "path_unresolved" };
  }
  const contractPath = contractPathResult.value.absolutePath;
  let raw: string;
  try {
    raw = await readFile(contractPath, "utf8");
  } catch {
    return { contractPath, status: "contract_missing" };
  }
  let json: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { contractPath, status: "invalid_json" };
    }
    json = parsed as Record<string, unknown>;
  } catch {
    return { contractPath, status: "invalid_json" };
  }
  if (isAcceptedTerminalState(json)) {
    return { contractPath, status: "noop" };
  }
  const next: Record<string, unknown> = {
    ...json,
    accepted: true,
    acceptanceCommitted: false,
  };
  if (typeof json.integrationState !== "string" || !json.integrationState) {
    next.integrationState = "accepted";
  }
  await writeFile(contractPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { contractPath, status: "patched" };
};
