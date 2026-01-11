import type { RunSummary } from "../api/orchestrator/runs-client";

type RunPickerViewProps = {
  readonly visible: boolean;
  readonly mode: "choice" | "list";
  readonly runs: readonly RunSummary[];
  readonly isEmpty: boolean;
  readonly status: string | null;
  readonly onCancel: () => void;
  readonly onCreateNew: () => void;
  readonly onShowList: () => void;
  readonly onBack: () => void;
  readonly onSelectRun: (runSlug: string) => void;
};

export const RunPickerView = ({
  visible,
  mode,
  runs,
  isEmpty,
  status,
  onCancel,
  onCreateNew,
  onShowList,
  onBack,
  onSelectRun,
}: RunPickerViewProps) => {
  if (!visible) {
    return null;
  }

  if (mode === "choice") {
    return (
      <section
        aria-labelledby="description-run-picker-heading"
        className="provider-picker"
      >
        <h2
          className="provider-picker__title"
          id="description-run-picker-heading"
        >
          Describe initiative
        </h2>
        <p className="provider-picker__description">
          Choose how you want to proceed.
        </p>
        <div className="provider-picker__actions">
          <output aria-live="polite" className="provider-picker__status">
            Start a new variant or refine an existing description.
          </output>
          <div className="provider-picker__action-buttons">
            <button
              className="provider-picker__secondary"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="provider-picker__secondary"
              onClick={onShowList}
              type="button"
            >
              Refine existing
            </button>
            <button
              className="provider-picker__primary"
              onClick={onCreateNew}
              type="button"
            >
              Create new description
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="description-run-picker-list-heading"
      className="provider-picker"
    >
      <h2
        className="provider-picker__title"
        id="description-run-picker-list-heading"
      >
        Refine existing descriptions
      </h2>
      <p className="provider-picker__description">Pick a run to continue.</p>
      <div className="provider-picker__options">
        {runs.map((run) => (
          <button
            className="provider-picker__option"
            key={run.runSlug}
            onClick={() => onSelectRun(run.runSlug)}
            type="button"
          >
            <span className="provider-picker__label">
              <span className="provider-picker__label-title">
                {run.runSlug}
              </span>
            </span>
          </button>
        ))}
        {isEmpty ? (
          <div className="provider-picker__status">
            No description runs yet.
          </div>
        ) : null}
      </div>
      <div className="provider-picker__actions">
        <output aria-live="polite" className="provider-picker__status">
          {status ?? "Select a run to continue."}
        </output>
        <div className="provider-picker__action-buttons">
          <button
            className="provider-picker__secondary"
            onClick={onBack}
            type="button"
          >
            Back
          </button>
          <button
            className="provider-picker__secondary"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
};
