import { useMemo } from "react";
import { useArtifactAvailability } from "./use-artifact-availability";

export const useDiagramModulesArtifactAvailability = (params: {
  readonly enabled: boolean;
  readonly workspacePath?: string;
  readonly workspaceSlug: string | null;
}): boolean => {
  const artifactPath = useMemo(
    () =>
      params.workspaceSlug
        ? `.codeai-hub/${params.workspaceSlug}/diagram_modules/module-map.md`
        : null,
    [params.workspaceSlug]
  );
  return useArtifactAvailability({ ...params, artifactPath });
};
