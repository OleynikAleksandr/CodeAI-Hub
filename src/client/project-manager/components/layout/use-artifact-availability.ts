import { useEffect, useState } from "react";
import { api } from "../../api";

/**
 * Generic polling hook that probes the workflow-artifact endpoint to determine
 * whether a given artifact file exists. Polls every 10 s while `enabled` is true.
 */
export const useArtifactAvailability = (params: {
  readonly enabled: boolean;
  readonly workspacePath?: string;
  readonly workspaceSlug: string | null;
  readonly artifactPath: string | null;
}): boolean => {
  const [available, setAvailable] = useState<boolean>(false);

  useEffect(() => {
    setAvailable(false);
  }, [params.enabled, params.workspacePath, params.workspaceSlug, params.artifactPath]);

  useEffect(() => {
    if (!params.enabled || !params.workspaceSlug || !params.workspacePath || !params.artifactPath) {
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
    const artifactPath = params.artifactPath;

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
  }, [available, params.artifactPath, params.enabled, params.workspacePath, params.workspaceSlug]);

  return available;
};
