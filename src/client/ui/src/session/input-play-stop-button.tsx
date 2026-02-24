import { memo, useEffect, useRef, useState } from "react";

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

const RESTART_ARM_TIMEOUT_MS = 4000;
const RESTART_RESET_TIMEOUT_MS = 15_000;

const RestartAttemptButton = ({
  context,
}: {
  readonly context: DescriptionRestartAttemptContext;
}) => {
  const [restartInFlight, setRestartInFlight] = useState(false);
  const [restartArmed, setRestartArmed] = useState(false);
  const restartTimerRef = useRef<number | null>(null);
  const restartArmTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
      if (restartArmTimerRef.current !== null) {
        window.clearTimeout(restartArmTimerRef.current);
      }
    },
    []
  );

  let label = "↻ Restart attempt";
  if (restartInFlight) {
    label = "↻ Restarting...";
  } else if (restartArmed) {
    label = "↻ Confirm restart";
  }

  let title = label;
  if (!(restartInFlight || restartArmed)) {
    title = "↻ Restart attempt (click again to confirm)";
  }

  const handleClick = () => {
    if (restartInFlight) {
      return;
    }
    if (!restartArmed) {
      setRestartArmed(true);
      if (restartArmTimerRef.current !== null) {
        window.clearTimeout(restartArmTimerRef.current);
      }
      restartArmTimerRef.current = window.setTimeout(() => {
        restartArmTimerRef.current = null;
        setRestartArmed(false);
      }, RESTART_ARM_TIMEOUT_MS);
      return;
    }
    setRestartArmed(false);
    if (restartArmTimerRef.current !== null) {
      window.clearTimeout(restartArmTimerRef.current);
      restartArmTimerRef.current = null;
    }
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
    <div className="session-input__action">
      <button
        aria-label={label}
        className={[
          "session-input__action-button",
          "session-input__action-button--stop",
        ].join(" ")}
        disabled={restartInFlight}
        onClick={handleClick}
        title={title}
        type="button"
      >
        <span
          aria-hidden="true"
          className={[
            "session-input__action-icon",
            "session-input__action-icon--play",
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
