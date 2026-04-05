import { useMemo } from "react";
import { useArtifactAvailability } from "./use-artifact-availability";

export const useApplicationFoundationEnvelopeArtifactAvailability = (
  params: {
    readonly enabled: boolean;
    readonly workspacePath?: string;
    readonly workspaceSlug: string | null;
  }
): boolean => {
  const artifactPath = useMemo(
    () =>
      params.workspaceSlug
        ? `.codeai-hub/${params.workspaceSlug}/application_foundation_envelope/application-foundation-envelope.md`
        : null,
    [params.workspaceSlug]
  );

  return useArtifactAvailability({ ...params, artifactPath });
};
