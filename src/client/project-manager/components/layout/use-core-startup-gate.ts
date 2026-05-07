import { useEffect, useRef, useState } from "react";
import { api } from "../../api";

const STARTUP_POLL_INTERVAL_MS = 1000;

export type CoreStartupGateState =
  | {
      readonly status: "starting";
      readonly detail?: string;
    }
  | {
      readonly status: "ready";
    };

const buildCoreStatusUrl = (): string | null => {
  const httpUrl = api.getHttpUrl();
  return httpUrl ? `${httpUrl}/api/v1/status` : null;
};

export const useCoreStartupGate = (): CoreStartupGateState => {
  const [state, setState] = useState<CoreStartupGateState>({
    status: "starting",
  });
  const inFlightRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    const statusUrl = buildCoreStatusUrl();
    if (!statusUrl) {
      setState({
        status: "starting",
        detail: "Core config is missing.",
      });
      return;
    }

    let cancelled = false;
    const checkReadiness = async (): Promise<void> => {
      if (readyRef.current || inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      try {
        const response = await fetch(statusUrl, { method: "GET" });
        if (cancelled) {
          return;
        }
        if (response.ok) {
          readyRef.current = true;
          api.connect();
          setState({ status: "ready" });
          return;
        }
        setState({
          status: "starting",
          detail: "Core status request failed.",
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "starting",
            detail: "Waiting for CodeAI Hub Core to respond.",
          });
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    void checkReadiness();
    const poll = window.setInterval(
      () => void checkReadiness(),
      STARTUP_POLL_INTERVAL_MS
    );

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

  return state;
};
