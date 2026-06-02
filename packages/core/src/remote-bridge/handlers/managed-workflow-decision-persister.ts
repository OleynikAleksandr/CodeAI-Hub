import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const persistManagedDecision = async (params: {
  readonly decision: unknown;
  readonly schema: string;
  readonly sessionId: string;
  readonly stage: "application_skeleton" | "diagram_modules" | "quality_gates";
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const relativePath = `.codeai-hub/${params.workspaceSlug}/workflow/managed/${params.stage}.json`;
  const absolutePath = path.join(params.workspaceRoot, relativePath);
  const snapshot = {
    schema: params.schema,
    stage: params.stage,
    sessionId: params.sessionId,
    updatedAt: new Date().toISOString(),
    ...(params.decision as Record<string, unknown>),
    diagnostics: undefined,
    nextPrompt: undefined,
  };
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(snapshot, null, 2)}\n`);
};
