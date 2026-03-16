export type DiagramModulesAgentAssetId =
  | "module-map-prompt"
  | "module-map-template"
  | "module-map-field-reference"
  | "module-map-merge-rules";

export const DiagramModulesAgentFacade = {
  getAssetPath: (_assetId: DiagramModulesAgentAssetId): string | null => null,
} as const;
