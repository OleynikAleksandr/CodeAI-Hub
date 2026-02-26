import { useMemo } from "react";
import { useArtifactAvailability } from "./use-artifact-availability";

export const useVirtualSimulationArtifactAvailability = (params: {
  readonly enabled: boolean;
  readonly workspacePath?: string;
  readonly workspaceSlug: string | null;
}): boolean => {
  const artifactPath = useMemo(
    () =>
      params.workspaceSlug
        ? `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`
        : null,
    [params.workspaceSlug]
  );
  return useArtifactAvailability({ ...params, artifactPath });
};
