import { type MutableRefObject, useCallback, useEffect, useRef } from "react";
import { api } from "../../api";

/**
 * Optimistic guard that prevents polling from prematurely downgrading
 * hasDescriptionSession after a session was just created via submit.
 * Deactivates on session:binding ready/failed or a 60s fallback timeout.
 */

const GUARD_FALLBACK_TIMEOUT_MS = 60_000;

export type DescriptionSessionGuard =
  | { readonly active: false }
  | { readonly active: true; readonly sessionId: string; readonly createdAt: number };

export type UseDescriptionSessionGuardResult = {
  readonly guardRef: MutableRefObject<DescriptionSessionGuard>;
  readonly activateGuard: (sessionId: string) => void;
  readonly resetGuard: () => void;
};

export const useDescriptionSessionGuard = (
  hasDescriptionSession: boolean
): UseDescriptionSessionGuardResult => {
  const guardRef = useRef<DescriptionSessionGuard>({ active: false });

  const activateGuard = useCallback((sessionId: string) => {
    guardRef.current = { active: true, sessionId, createdAt: Date.now() };
  }, []);

  const resetGuard = useCallback(() => {
    guardRef.current = { active: false };
  }, []);

  // Listen for session:binding to deactivate guard when binding completes
  useEffect(() => {
    const guard = guardRef.current;
    if (!guard.active) return;
    const guardSessionId = guard.sessionId;

    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "session:binding") return;
      const current = guardRef.current;
      if (!current.active || current.sessionId !== guardSessionId) return;
      const payload = message.payload as Record<string, unknown> | undefined;
      if (!payload || payload.sessionId !== guardSessionId) return;
      if (payload.status === "ready" || payload.status === "failed") {
        guardRef.current = { active: false };
      }
    });
    const fallbackTimer = window.setTimeout(() => {
      const current = guardRef.current;
      if (current.active && current.sessionId === guardSessionId) {
        guardRef.current = { active: false };
      }
    }, GUARD_FALLBACK_TIMEOUT_MS);

    return () => {
      unsubscribe();
      window.clearTimeout(fallbackTimer);
    };
  }, [hasDescriptionSession]);

  return { guardRef, activateGuard, resetGuard };
};
