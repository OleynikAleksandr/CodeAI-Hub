import { useMemo } from "react";
import { useArtifactAvailability } from "./use-artifact-availability";

/**
 * Probes the workflow-artifact endpoint for the canonical Description artifact
 * (Final_Description.md). Returns true only when the file physically exists
 * AND is readable through the current HTTP path contract.
 */
export const useDescriptionArtifactAvailability = (params: {
  readonly enabled: boolean;
  readonly workspacePath?: string;
  readonly workspaceSlug: string | null;
}): boolean => {
  const artifactPath = useMemo(
    () =>
      params.workspaceSlug
        ? `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`
        : null,
    [params.workspaceSlug]
  );
  return useArtifactAvailability({ ...params, artifactPath });
};
