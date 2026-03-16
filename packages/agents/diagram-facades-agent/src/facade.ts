export type DiagramFacadesAgentAssetId =
  | "facade-map-prompt"
  | "facade-map-template"
  | "facade-map-field-reference"
  | "facade-map-merge-rules";

export const DiagramFacadesAgentFacade = {
  getAssetPath: (_assetId: DiagramFacadesAgentAssetId): string | null => null,
} as const;
