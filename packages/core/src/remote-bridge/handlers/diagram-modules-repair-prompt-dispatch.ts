import { buildDiagramModulesProductPartRepairPrompt } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder";
import type { DiagramModulesManagedValidationResult } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-validator";

export const buildDiagramModulesRepairDispatch = (
  params: {
    readonly workspaceSlug: string;
  },
  decision: DiagramModulesManagedValidationResult,
  rejectedCommitHash: string,
  attemptNumber: number
): { readonly notice: string; readonly prompt: string } => {
  const prompt = buildDiagramModulesProductPartRepairPrompt({
    attemptNumber,
    currentPartId: decision.currentPartId,
    diagnostics: decision.diagnostics,
    rejectedCommitHash,
    workspaceSlug: params.workspaceSlug,
  });
  const repairTarget = decision.currentPartId
    ? `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${decision.currentPartId}.md`
    : `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
  return {
    prompt,
    notice: [
      "Core: Diagram Modules требует исправить staged artifact.",
      `Target artifact: \`${repairTarget}\`.`,
      "Diagnostics:",
      ...decision.diagnostics.map((diagnostic) => `- ${diagnostic}`),
      "Полный repair prompt отправлен агенту внутренним сообщением.",
    ].join("\n"),
  };
};
