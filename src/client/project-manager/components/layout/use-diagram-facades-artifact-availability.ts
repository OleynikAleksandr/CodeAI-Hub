import { useMemo } from "react";
import { useArtifactAvailability } from "./use-artifact-availability";

export const useDiagramFacadesArtifactAvailability = (params: {
  readonly enabled: boolean;
  readonly workspacePath?: string;
  readonly workspaceSlug: string | null;
}): boolean => {
  const artifactPath = useMemo(
    () =>
      params.workspaceSlug
        ? `.codeai-hub/${params.workspaceSlug}/diagram_facades/facades-graph.mmd`
        : null,
    [params.workspaceSlug]
  );
  return useArtifactAvailability({ ...params, artifactPath });
};
