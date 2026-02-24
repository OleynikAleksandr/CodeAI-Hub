import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { api } from "../../api";
import { IdeaCollectorSubmitService } from "../../services/idea-collector-submit-service";

const RESTART_CONFIRM_TIMEOUT_MS = 10_000;

export type QuestionnaireRestartAttemptControlProps = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly questionnairePath: string;
  readonly onError: (message: string | null) => void;
};

export const QuestionnaireRestartAttemptControl = ({
  workspacePath,
  workspaceSlug,
  questionnairePath,
  onError,
}: QuestionnaireRestartAttemptControlProps) => {
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [restartInFlight, setRestartInFlight] = useState(false);
  const submitServiceRef = useRef(new IdeaCollectorSubmitService());
  const restartConfirmTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      if (restartConfirmTimerRef.current !== null) {
        window.clearTimeout(restartConfirmTimerRef.current);
      }
    },
    []
  );

  const clearRestartConfirmTimer = useCallback(() => {
    if (restartConfirmTimerRef.current === null) {
      return;
    }
    window.clearTimeout(restartConfirmTimerRef.current);
    restartConfirmTimerRef.current = null;
  }, []);

  const closeRestartConfirm = useCallback(() => {
    setRestartConfirmOpen(false);
    clearRestartConfirmTimer();
  }, [clearRestartConfirmTimer]);

  const openRestartConfirm = useCallback(() => {
    if (restartInFlight) {
      return;
    }
    setRestartConfirmOpen(true);
    clearRestartConfirmTimer();
    restartConfirmTimerRef.current = window.setTimeout(() => {
      restartConfirmTimerRef.current = null;
      setRestartConfirmOpen(false);
    }, RESTART_CONFIRM_TIMEOUT_MS);
  }, [clearRestartConfirmTimer, restartInFlight]);

  useEffect(() => {
    if (!restartConfirmOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRestartConfirm();
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!root.contains(target)) {
        closeRestartConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closeRestartConfirm, restartConfirmOpen]);

  const handleRestartAttempt = useCallback(async () => {
    if (restartInFlight) {
      return;
    }

    onError(null);
    setRestartInFlight(true);
    try {
      const state = await api.getWorkflowState(workspaceSlug, workspacePath);
      const providerId =
        state?.description?.collectorSession?.providerId ??
        state?.description?.session?.providerId ??
        api.getIdeaCollectorProviders().at(0)?.id ??
        null;

      if (!providerId) {
        onError("Не удалось определить провайдера для перезапуска.");
        return;
      }

      await submitServiceRef.current.submitQuestionnaire({
        workspacePath,
        workspaceSlug,
        questionnairePath,
        stage: "description",
        providerId: providerId as ProviderStackId,
      });
    } catch (submitError: unknown) {
      onError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setRestartInFlight(false);
    }
  }, [onError, questionnairePath, restartInFlight, workspacePath, workspaceSlug]);

  const handleRestartClick = () => {
    if (restartInFlight) {
      return;
    }
    if (restartConfirmOpen) {
      closeRestartConfirm();
      return;
    }
    openRestartConfirm();
  };

  const handleRestartApply = () => {
    if (restartInFlight) {
      return;
    }
    closeRestartConfirm();
    void handleRestartAttempt();
  };

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      {restartConfirmOpen && !restartInFlight ? (
        <div
          aria-label="Confirm restart attempt"
          role="dialog"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(30,30,30,0.98)",
            boxShadow: "0 6px 22px rgba(0,0,0,0.45)",
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "rgba(240,240,240,0.92)",
              whiteSpace: "nowrap",
            }}
          >
            Restart attempt?
          </span>
          <button
            onClick={handleRestartApply}
            style={{
              height: 24,
              padding: "0 10px",
              borderRadius: 4,
              border: "1px solid rgba(220,61,61,0.45)",
              background: "rgba(220,61,61,0.28)",
              color: "rgba(255,255,255,0.95)",
              fontSize: 12,
              cursor: "pointer",
              lineHeight: 1,
            }}
            type="button"
          >
            Apply
          </button>
          <button
            onClick={closeRestartConfirm}
            style={{
              height: 24,
              padding: "0 10px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontSize: 12,
              cursor: "pointer",
              lineHeight: 1,
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : null}
      <button
        aria-label="Restart attempt"
        disabled={restartInFlight}
        onClick={handleRestartClick}
        style={{
          width: 36,
          height: 32,
          padding: 0,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.18)",
          background: restartInFlight
            ? "rgba(255,255,255,0.06)"
            : restartConfirmOpen
              ? "rgba(255,255,255,0.18)"
              : "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.92)",
          fontSize: 22.4,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: restartInFlight ? "not-allowed" : "pointer",
        }}
        title={restartInFlight ? "↻ Restarting..." : "↻ Restart attempt"}
        type="button"
      >
        ↻
      </button>
    </div>
  );
};

