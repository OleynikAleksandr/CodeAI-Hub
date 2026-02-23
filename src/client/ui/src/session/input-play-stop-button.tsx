import { memo } from "react";

type InputPlayStopButtonProps = {
  readonly stopActive: boolean;
  readonly onClick: () => void;
};

const InputPlayStopButton = ({
  stopActive,
  onClick,
}: InputPlayStopButtonProps) => {
  const label = stopActive ? "Stop (stop core)" : "Send message (Enter)";
  const iconClassName = [
    "session-input__action-icon",
    stopActive
      ? "session-input__action-icon--stop"
      : "session-input__action-icon--play",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="session-input__action">
      <button
        aria-label={label}
        className={[
          "session-input__action-button",
          stopActive ? "session-input__action-button--stop" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
        title={label}
        type="button"
      >
        <span aria-hidden="true" className={iconClassName}>
          {stopActive ? null : "▶"}
        </span>
      </button>
    </div>
  );
};

export default memo(InputPlayStopButton);
