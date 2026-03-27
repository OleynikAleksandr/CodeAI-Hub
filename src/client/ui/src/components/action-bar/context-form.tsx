interface ActionBarContextFormProps {
  readonly controlsDisabled: boolean;
  readonly description: string;
  readonly mode: "initiative" | null;
  readonly name: string;
  readonly onCancel: () => void;
  readonly onDescriptionChange: (value: string) => void;
  readonly onNameChange: (value: string) => void;
  readonly onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  readonly statusMessage: string | null;
  readonly title: string;
}

export const ActionBarContextForm = ({
  mode,
  title,
  name,
  description,
  controlsDisabled,
  statusMessage,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}: ActionBarContextFormProps) => (
  <>
    {mode ? (
      <form className="action-bar__context-form" onSubmit={onSubmit}>
        <span className="action-bar__context-form-title">{title}</span>
        <input
          aria-label="Name"
          className="action-bar__context-input"
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Name"
          type="text"
          value={name}
        />
        <input
          aria-label="Description"
          className="action-bar__context-input"
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Description (optional)"
          type="text"
          value={description}
        />
        <div className="action-bar__context-form-actions">
          <button
            className="action-bar__context-button"
            disabled={controlsDisabled}
            type="submit"
          >
            Create
          </button>
          <button
            className="action-bar__context-button"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    ) : null}
    {statusMessage ? (
      <output aria-live="polite" className="action-bar__context-status">
        {statusMessage}
      </output>
    ) : null}
  </>
);
