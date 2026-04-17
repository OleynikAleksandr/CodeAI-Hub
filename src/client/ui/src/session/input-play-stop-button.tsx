import { memo } from "react";

interface InputPlayStopButtonProps {
  readonly onClick: () => void;
  readonly stopActive: boolean;
  readonly stopPending?: boolean;
}

const InputPlayStopButton = ({
  stopActive,
  stopPending = false,
  onClick,
}: InputPlayStopButtonProps) => {
  const showStop = stopActive;
  const resolveStopLabel = () =>
    stopPending ? "Stopping current turn…" : "Stop current turn";
  const label = showStop ? resolveStopLabel() : "Send message (Enter)";
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
          showStop ? "session-input__action-button--stop" : "",
          stopPending ? "session-input__action-button--stop-pending" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={stopPending}
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
