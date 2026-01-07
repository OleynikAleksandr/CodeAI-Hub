import { useCallback } from "react";
import { activateRoot } from "../../root-dom";
import { postVsCodeMessage } from "../../vscode";

type ActionBarCommand =
  | "startChat"
  | "startIdea"
  | "startSpec"
  | "startPlan"
  | "startExecute";

type ButtonDescriptor = {
  readonly id: ActionBarCommand;
  readonly label: readonly [string, string];
};

const BUTTONS: readonly ButtonDescriptor[] = [
  { id: "startChat", label: ["Simple", "Chat"] },
  { id: "startIdea", label: ["Idea", ""] },
  { id: "startSpec", label: ["Spec", ""] },
  { id: "startPlan", label: ["Plan", ""] },
  { id: "startExecute", label: ["Execute", ""] },
];

type ActionBarProps = {
  readonly disabled?: boolean;
};

const ActionBar = ({ disabled = false }: ActionBarProps) => {
  const handleClick = useCallback(
    (command: ActionBarCommand) => {
      if (disabled) {
        return;
      }

      activateRoot();

      postVsCodeMessage({ command });
    },
    [disabled]
  );

  return (
    <header className="action-bar">
      <div className="action-bar__surface">
        <div
          aria-hidden="true"
          className="action-bar__rail action-bar__rail--top"
        />
        <div
          aria-hidden="true"
          className="action-bar__rail action-bar__rail--bottom"
        />
        <div className="action-bar__buttons">
          {BUTTONS.map(({ id, label }) => {
            const ariaLabel = label.filter(Boolean).join(" ");
            return (
              <button
                aria-label={ariaLabel}
                className="action-bar__button"
                disabled={disabled}
                key={id}
                onClick={() => handleClick(id)}
                type="button"
              >
                <span className="action-bar__line">{label[0]}</span>
                <span className="action-bar__line">{label[1]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default ActionBar;
