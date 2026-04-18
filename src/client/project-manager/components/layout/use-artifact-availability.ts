import { useEffect, useState } from "react";
import { api } from "../../api";

const FOREGROUND_POLL_MS = 10_000;
const BACKGROUND_POLL_MS = 30_000;

type ArtifactPollingMode = "foreground" | "background" | "hidden";

const resolveArtifactPollingMode = (): ArtifactPollingMode => {
  if (typeof document === "undefined") {
    return "foreground";
  }
  if (document.visibilityState !== "visible") {
    return "hidden";
  }
  return document.hasFocus() ? "foreground" : "background";
};

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
    let probeInFlight = false;
    let pendingImmediateProbe = false;
    let pollingMode = resolveArtifactPollingMode();
    const artifactPath = params.artifactPath;

    const resolveIntervalMs = (): number | null => {
      if (pollingMode === "hidden") {
        return null;
      }
      return pollingMode === "background"
        ? BACKGROUND_POLL_MS
        : FOREGROUND_POLL_MS;
    };

    const scheduleNextProbe = () => {
      window.clearTimeout(timer);
      timer = 0;
      const intervalMs = resolveIntervalMs();
      if (cancelled || intervalMs === null) {
        return;
      }
      timer = window.setTimeout(() => {
        void probe();
      }, intervalMs);
    };

    const requestImmediateProbe = () => {
      window.clearTimeout(timer);
      timer = 0;
      if (cancelled || resolveIntervalMs() === null) {
        return;
      }
      if (probeInFlight) {
        pendingImmediateProbe = true;
        return;
      }
      void probe();
    };

    const probe = async () => {
      if (cancelled || resolveIntervalMs() === null) {
        return;
      }
      probeInFlight = true;
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
      } finally {
        probeInFlight = false;
        if (cancelled) {
          return;
        }
        if (pendingImmediateProbe && resolveIntervalMs() !== null) {
          pendingImmediateProbe = false;
          void probe();
          return;
        }
        pendingImmediateProbe = false;
        scheduleNextProbe();
      }
    };

    const handleActivityChange = () => {
      const nextMode = resolveArtifactPollingMode();
      if (nextMode === pollingMode) {
        return;
      }
      pollingMode = nextMode;
      if (pollingMode === "foreground") {
        requestImmediateProbe();
        return;
      }
      pendingImmediateProbe = false;
      scheduleNextProbe();
    };

    if (resolveIntervalMs() !== null) {
      requestImmediateProbe();
    }
    window.addEventListener("focus", handleActivityChange);
    window.addEventListener("blur", handleActivityChange);
    document.addEventListener("visibilitychange", handleActivityChange);

    return () => {
      cancelled = true;
      pendingImmediateProbe = false;
      window.clearTimeout(timer);
      timer = 0;
      window.removeEventListener("focus", handleActivityChange);
      window.removeEventListener("blur", handleActivityChange);
      document.removeEventListener("visibilitychange", handleActivityChange);
    };
  }, [params.artifactPath, params.enabled, params.workspacePath, params.workspaceSlug]);

  return available;
};
