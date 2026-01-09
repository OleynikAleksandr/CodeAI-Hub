import { useCallback, useMemo, useState } from "react";
import { activateRoot } from "../../root-dom";
import { postVsCodeMessage } from "../../vscode";
import { ActionBarContextForm } from "./context-form";
import { useInitiativeContext } from "./use-initiative-context";

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

const CHAT_BUTTONS = BUTTONS.filter((button) => button.id === "startChat");
const FLOW_BUTTONS = BUTTONS.filter((button) => button.id !== "startChat");

type ActionBarProps = {
  readonly disabled?: boolean;
};

const ActionBar = ({ disabled = false }: ActionBarProps) => {
  const {
    initiatives,
    runs,
    selectedInitiativeSlug,
    selectedRunId,
    initiativeTitle,
    runTitle,
    canStartFlow,
    controlsDisabled,
    statusMessage,
    handleInitiativeChange,
    handleRunChange,
    createInitiative,
    createRun,
    clearStatus,
  } = useInitiativeContext(disabled);

  const [createMode, setCreateMode] = useState<"initiative" | "run" | null>(
    null
  );
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  const initiativePlaceholder =
    initiatives.length === 0 ? "No initiatives yet" : "Select initiative";

  const runPlaceholder = useMemo(() => {
    if (!selectedInitiativeSlug) {
      return "Select initiative first";
    }
    if (runs.length === 0) {
      return "No runs yet";
    }
    return "Select run";
  }, [runs.length, selectedInitiativeSlug]);

  const formTitle = createMode === "initiative" ? "New initiative" : "New run";

  const handleStartCreateInitiative = useCallback(() => {
    clearStatus();
    setCreateMode("initiative");
    setDraftName("");
    setDraftDescription("");
  }, [clearStatus]);

  const handleStartCreateRun = useCallback(() => {
    clearStatus();
    setCreateMode("run");
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
        createMode === "initiative"
          ? await createInitiative(input)
          : await createRun(input);

      if (success) {
        setCreateMode(null);
        setDraftName("");
        setDraftDescription("");
      }
    },
    [createInitiative, createMode, createRun, draftDescription, draftName]
  );

  const handleClick = useCallback(
    (command: ActionBarCommand) => {
      if (command !== "startChat" && !canStartFlow) {
        return;
      }
      if (disabled) {
        return;
      }

      activateRoot();

      postVsCodeMessage({ command });
    },
    [canStartFlow, disabled]
  );

  const flowDisabled = disabled || !canStartFlow;
  const createRunDisabled = controlsDisabled || !selectedInitiativeSlug;

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
          </div>
          <div className="action-bar__context-group">
            <label className="action-bar__context-label" htmlFor="run">
              Run
            </label>
            <select
              aria-label="Run"
              className="action-bar__context-select"
              disabled={controlsDisabled || !selectedInitiativeSlug}
              id="run"
              onChange={handleRunChange}
              title={runTitle}
              value={selectedRunId ?? ""}
            >
              <option disabled value="">
                {runPlaceholder}
              </option>
              {runs.map((run) => (
                <option key={run.runId} value={run.runId}>
                  {run.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="action-bar__context-actions">
            <button
              className="action-bar__context-button"
              disabled={controlsDisabled}
              onClick={handleStartCreateInitiative}
              type="button"
            >
              +
            </button>
            <button
              className="action-bar__context-button"
              disabled={createRunDisabled}
              onClick={handleStartCreateRun}
              type="button"
            >
              + run
            </button>
          </div>
        </div>
        <ActionBarContextForm
          controlsDisabled={controlsDisabled}
          createRunDisabled={createRunDisabled}
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
            {CHAT_BUTTONS.map(({ id, label }) => {
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
          <div className="action-bar__button-zone action-bar__button-zone--flow">
            {FLOW_BUTTONS.map(({ id, label }) => {
              const ariaLabel = label.filter(Boolean).join(" ");
              return (
                <button
                  aria-label={ariaLabel}
                  className="action-bar__button"
                  disabled={flowDisabled}
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
