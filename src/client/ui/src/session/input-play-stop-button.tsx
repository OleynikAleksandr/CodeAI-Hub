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

const InputPlayStopButton = ({
  stopActive,
  onClick,
  descriptionRestartAttempt = null,
}: InputPlayStopButtonProps) => {
  const [restartInFlight, setRestartInFlight] = useState(false);
  const restartTimerRef = useRef<number | null>(null);

  const restartAttemptActive =
    descriptionRestartAttempt != null &&
    descriptionRestartAttempt.workspacePath.trim().length > 0 &&
    descriptionRestartAttempt.workspaceSlug.trim().length > 0;
  const showStop = stopActive && !restartAttemptActive;
  let label = "Send message (Enter)";
  if (restartAttemptActive) {
    label = "↻ Restart attempt";
  } else if (showStop) {
    label = "Stop (stop core)";
  }

  let iconModifierClass = "session-input__action-icon--play";
  if (showStop) {
    iconModifierClass = "session-input__action-icon--stop";
  }
  const iconClassName = ["session-input__action-icon", iconModifierClass]
    .filter(Boolean)
    .join(" ");

  let iconContent: string | null = "▶";
  if (restartAttemptActive) {
    iconContent = "↻";
  } else if (showStop) {
    iconContent = null;
  }

  useEffect(
    () => () => {
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
    },
    []
  );

  const handleClick = () => {
    if (restartAttemptActive) {
      if (restartInFlight) {
        return;
      }
      setRestartInFlight(true);
      window.dispatchEvent(
        new CustomEvent("pm:description:restart-attempt", {
          detail: descriptionRestartAttempt,
        })
      );
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        setRestartInFlight(false);
      }, 15_000);
      return;
    }
    onClick();
  };

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
        disabled={restartAttemptActive && restartInFlight}
        onClick={handleClick}
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
