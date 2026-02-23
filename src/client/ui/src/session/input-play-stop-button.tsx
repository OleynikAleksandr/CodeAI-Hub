import { memo } from "react";

type InputPlayStopButtonProps = {
  readonly stopActive: boolean;
  readonly onClick: () => void;
};

const InputPlayStopButton = ({
  stopActive,
  onClick,
}: InputPlayStopButtonProps) => {
  const label = stopActive ? "Stop (restart core)" : "Send message (Enter)";

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
        <span aria-hidden="true" className="session-input__action-icon">
          {stopActive ? "■" : "▶"}
        </span>
      </button>
    </div>
  );
};

export default memo(InputPlayStopButton);
