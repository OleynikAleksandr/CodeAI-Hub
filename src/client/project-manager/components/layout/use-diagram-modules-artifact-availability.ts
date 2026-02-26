import { useEffect, useState } from "react";
import { api } from "../../api";

export const useDiagramModulesArtifactAvailability = (params: {
  readonly enabled: boolean;
  readonly workspacePath?: string;
  readonly workspaceSlug: string | null;
}): boolean => {
  const [available, setAvailable] = useState<boolean>(false);

  useEffect(() => {
    setAvailable(false);
  }, [params.enabled, params.workspacePath, params.workspaceSlug]);

  useEffect(() => {
    if (!params.enabled || !params.workspaceSlug || !params.workspacePath) {
      setAvailable(false);
      return;
    }
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      setAvailable(false);
      return;
    }

    let cancelled = false;
    let timer = 0;
    const artifactPath = `.codeai-hub/${params.workspaceSlug}/diagram_modules/modules-diagram.mmd`;

    const probe = async () => {
      try {
        const query = new URLSearchParams({
          workspacePath: params.workspacePath ?? "",
          workspaceSlug: params.workspaceSlug ?? "",
          path: artifactPath,
          maxBytes: "1",
        });
        const response = await fetch(
          `${httpUrl}/api/v1/orchestrator/workflow-artifact?${query.toString()}`,
          { method: "GET" }
        );
        if (cancelled) {
          return;
        }
        if (response.status === 404) {
          setAvailable(false);
          return;
        }
        if (!response.ok) {
          return;
        }
        setAvailable(true);
      } catch {
        // ignore probe errors; tree will retry on next tick.
      }
    };

    probe();
    timer = window.setInterval(probe, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [available, params.enabled, params.workspacePath, params.workspaceSlug]);

  return available;
};
