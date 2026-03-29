import { memo } from "react";

interface InputPlayStopButtonProps {
  readonly onClick: () => void;
  readonly stopActive: boolean;
}

const InputPlayStopButton = ({
  stopActive,
  onClick,
}: InputPlayStopButtonProps) => {
  const showStop = stopActive;
  const label = showStop ? "Stop current turn" : "Send message (Enter)";
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
