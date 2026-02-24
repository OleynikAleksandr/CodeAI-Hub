import { memo, useCallback, useEffect, useRef, useState } from "react";

export type DescriptionRestartAttemptContext = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: string | null;
};

type InputPlayStopButtonProps = {
  readonly stopActive: boolean;
  readonly onClick: () => void;
  readonly descriptionRestartAttempt?: DescriptionRestartAttemptContext | null;
};

const RESTART_RESET_TIMEOUT_MS = 15_000;
const RESTART_CONFIRM_TIMEOUT_MS = 10_000;

const RestartAttemptButton = ({
  context,
}: {
  readonly context: DescriptionRestartAttemptContext;
}) => {
  const [restartInFlight, setRestartInFlight] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const restartTimerRef = useRef<number | null>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
      if (confirmTimerRef.current !== null) {
        window.clearTimeout(confirmTimerRef.current);
      }
    },
    []
  );

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current === null) {
      return;
    }
    window.clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = null;
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    clearConfirmTimer();
  }, [clearConfirmTimer]);

  const openConfirm = useCallback(() => {
    if (restartInFlight) {
      return;
    }
    setConfirmOpen(true);
    clearConfirmTimer();
    confirmTimerRef.current = window.setTimeout(() => {
      confirmTimerRef.current = null;
      setConfirmOpen(false);
    }, RESTART_CONFIRM_TIMEOUT_MS);
  }, [clearConfirmTimer, restartInFlight]);

  useEffect(() => {
    if (!confirmOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeConfirm();
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
        closeConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closeConfirm, confirmOpen]);

  const label = restartInFlight ? "↻ Restarting..." : "↻ Restart attempt";

  const handleClick = () => {
    if (restartInFlight) {
      return;
    }
    if (confirmOpen) {
      closeConfirm();
      return;
    }
    openConfirm();
  };

  const handleApply = () => {
    if (restartInFlight) {
      return;
    }
    closeConfirm();
    setRestartInFlight(true);
    window.dispatchEvent(
      new CustomEvent("pm:description:restart-attempt", {
        detail: context,
      })
    );
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      setRestartInFlight(false);
    }, RESTART_RESET_TIMEOUT_MS);
  };

  return (
    <div className="session-input__action" ref={rootRef}>
      {confirmOpen && !restartInFlight ? (
        <div
          aria-label="Confirm restart attempt"
          className="session-input__confirm-popover"
          role="dialog"
        >
          <span className="session-input__confirm-text">Restart attempt?</span>
          <button
            className={[
              "session-input__confirm-button",
              "session-input__confirm-button--apply",
            ].join(" ")}
            onClick={handleApply}
            type="button"
          >
            Apply
          </button>
          <button
            className={[
              "session-input__confirm-button",
              "session-input__confirm-button--cancel",
            ].join(" ")}
            onClick={closeConfirm}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : null}
      <button
        aria-label={label}
        className={[
          "session-input__action-button",
          "session-input__action-button--stop",
        ].join(" ")}
        disabled={restartInFlight}
        onClick={handleClick}
        title={label}
        type="button"
      >
        <span
          aria-hidden="true"
          className={[
            "session-input__action-icon",
            "session-input__action-icon--restart",
          ].join(" ")}
        >
          ↻
        </span>
      </button>
    </div>
  );
};

const InputPlayStopButton = ({
  stopActive,
  onClick,
  descriptionRestartAttempt = null,
}: InputPlayStopButtonProps) => {
  const restartAttemptActive =
    descriptionRestartAttempt != null &&
    descriptionRestartAttempt.workspacePath.trim().length > 0 &&
    descriptionRestartAttempt.workspaceSlug.trim().length > 0;
  if (restartAttemptActive) {
    return descriptionRestartAttempt ? (
      <RestartAttemptButton context={descriptionRestartAttempt} />
    ) : null;
  }

  const showStop = stopActive;
  const label = showStop ? "Stop (stop core)" : "Send message (Enter)";
  const iconModifierClass = showStop
    ? "session-input__action-icon--stop"
    : "session-input__action-icon--play";
  const iconClassName = ["session-input__action-icon", iconModifierClass]
    .filter(Boolean)
    .join(" ");

  const iconContent: string | null = showStop ? null : "▶";

  return (
    <div className="session-input__action">
      <button
        aria-label={label}
        className={[
          "session-input__action-button",
          showStop || restartAttemptActive
            ? "session-input__action-button--stop"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        title={label}
        type="button"
      >
        <span aria-hidden="true" className={iconClassName}>
          {iconContent}
        </span>
      </button>
    </div>
  );
};

export default memo(InputPlayStopButton);
