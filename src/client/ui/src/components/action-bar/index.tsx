import { useCallback, useState } from "react";
import { activateRoot } from "../../root-dom";
import { postVsCodeMessage } from "../../vscode";
import { ActionBarContextForm } from "./context-form";
import { useInitiativeContext } from "./use-initiative-context";

type ActionBarCommand = "startChat";

interface ButtonDescriptor {
  readonly id: ActionBarCommand;
  readonly label: readonly [string, string];
}

const BUTTONS: readonly ButtonDescriptor[] = [
  { id: "startChat", label: ["Simple", "Chat"] },
];

interface ActionBarProps {
  readonly disabled?: boolean;
}

const ActionBar = ({ disabled = false }: ActionBarProps) => {
  const {
    initiatives,
    selectedInitiativeSlug,
    initiativeTitle,
    controlsDisabled,
    statusMessage,
    handleInitiativeChange,
    createInitiative,
    clearStatus,
  } = useInitiativeContext(disabled);

  const [createMode, setCreateMode] = useState<"initiative" | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  const initiativePlaceholder =
    initiatives.length === 0 ? "No initiatives yet" : "Select initiative";

  const formTitle = "New initiative";

  const handleStartCreateInitiative = useCallback(() => {
    clearStatus();
    setCreateMode("initiative");
    setDraftName("");
    setDraftDescription("");
  }, [clearStatus]);

  const handleCancelCreate = useCallback(() => {
    setCreateMode(null);
    setDraftName("");
    setDraftDescription("");
  }, []);

  const handleSubmitCreate = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!createMode) {
        return;
      }

      const input = {
        displayName: draftName,
        description: draftDescription,
      };

      const success =
        createMode === "initiative" ? await createInitiative(input) : false;

      if (success) {
        setCreateMode(null);
        setDraftName("");
        setDraftDescription("");
      }
    },
    [createInitiative, createMode, draftDescription, draftName]
  );

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
        <div className="action-bar__context">
          <div className="action-bar__context-group">
            <label className="action-bar__context-label" htmlFor="initiative">
              Initiative
            </label>
            <div className="action-bar__context-row">
              <select
                aria-label="Initiative"
                className="action-bar__context-select"
                disabled={controlsDisabled}
                id="initiative"
                onChange={handleInitiativeChange}
                title={initiativeTitle}
                value={selectedInitiativeSlug ?? ""}
              >
                <option disabled value="">
                  {initiativePlaceholder}
                </option>
                {initiatives.map((initiative) => (
                  <option
                    key={initiative.initiativeSlug}
                    value={initiative.initiativeSlug}
                  >
                    {initiative.displayName}
                  </option>
                ))}
              </select>
              <button
                className="action-bar__context-button"
                disabled={controlsDisabled}
                onClick={handleStartCreateInitiative}
                type="button"
              >
                New
              </button>
            </div>
          </div>
        </div>
        <ActionBarContextForm
          controlsDisabled={controlsDisabled}
          description={draftDescription}
          mode={createMode}
          name={draftName}
          onCancel={handleCancelCreate}
          onDescriptionChange={setDraftDescription}
          onNameChange={setDraftName}
          onSubmit={handleSubmitCreate}
          statusMessage={statusMessage}
          title={formTitle}
        />
        <div className="action-bar__buttons">
          <div className="action-bar__button-zone action-bar__button-zone--chat">
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
      </div>
    </header>
  );
};

export default ActionBar;
