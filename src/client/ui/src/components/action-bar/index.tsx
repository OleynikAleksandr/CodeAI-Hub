import { useCallback } from "react";
import { activateRoot } from "../../root-dom";
import { postVsCodeMessage } from "../../vscode";

type ActionBarCommand =
  | "newSession"
  | "lastSession"
  | "launchWebClient"
  | "oldSessions";

type ButtonDescriptor = {
  readonly id: ActionBarCommand;
  readonly label: readonly [string, string];
  readonly highlighted?: boolean;
};

const BUTTONS: readonly ButtonDescriptor[] = [
  { id: "newSession", label: ["New", "Session"] },
  { id: "lastSession", label: ["Last", "Session"], highlighted: true },
  { id: "launchWebClient", label: ["UI", "Outside"] },
  { id: "oldSessions", label: ["Old", "Sessions"] },
];

const ActionBar = () => {
  const handleClick = useCallback((command: ActionBarCommand) => {
    if (command === "newSession") {
      activateRoot();
    }

    postVsCodeMessage({ command });
  }, []);

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
          {BUTTONS.map(({ id, label, highlighted }) => (
            <button
              aria-label={`${label[0]} ${label[1]}`}
              className={
                highlighted
                  ? "action-bar__button action-bar__button--highlight"
                  : "action-bar__button"
              }
              key={id}
              onClick={() => handleClick(id)}
              type="button"
            >
              <span className="action-bar__line">{label[0]}</span>
              <span className="action-bar__line">{label[1]}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default ActionBar;
