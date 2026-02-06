import { useCallback, useEffect, useState } from "react";
import { InputTextarea } from "./input-textarea";

type InputPanelProps = {
  readonly draft: string;
  readonly connectionState?: "idle" | "running" | "blocked";
  readonly continuityLockActive?: boolean;
  readonly isQueued?: boolean;
  readonly onSubmit: (text: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 200;

const InputPanel = ({
  draft,
  connectionState = "idle",
  continuityLockActive = false,
  isQueued = false,
  onSubmit,
}: InputPanelProps) => {
  const isDisabled = connectionState === "running" || isQueued;
  const placeholder = (() => {
    if (isQueued) {
      return "Message queued. Sending as soon as it is ready…";
    }
    if (continuityLockActive) {
      return "Agent is preparing a continuation… Please wait.";
    }
    if (connectionState === "blocked") {
      return "Agent is preparing a continuation… Please wait.";
    }
    if (connectionState === "running") {
      return "Agent is working… Please wait.";
    }
    return "Type your request or drag files with Shift held...";
  })();
  const [value, setValue] = useState(draft);

  useEffect(() => {
    setValue(draft);
  }, [draft]);

  const sendMessage = useCallback(() => {
    if (isDisabled) {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setValue("");
  }, [isDisabled, onSubmit, value]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      sendMessage();
    },
    [sendMessage]
  );

  return (
    <form
      aria-label="Message input"
      className="session-input session-panel"
      onSubmit={handleSubmit}
    >
      <fieldset
        disabled={isDisabled}
        style={{ border: 0, padding: 0, margin: 0 }}
      >
        <InputTextarea
          classes={{
            container: "session-input__container",
            containerDragging: "session-input__container--dragging",
            textarea: "session-input__textarea",
            textareaFocused: "session-input__textarea--focused",
            overlay: "session-input__overlay",
          }}
          maxHeight={MAX_TEXTAREA_HEIGHT}
          onSubmit={sendMessage}
          onValueChange={setValue}
          placeholder={placeholder}
          value={value}
        />
      </fieldset>

      {connectionState === "idle" && !isQueued ? (
        <div className="session-input__footer">
          <span className="session-input__hint">
            Press Enter to send, Shift+Enter for a new line
          </span>
        </div>
      ) : null}
    </form>
  );
};

export default InputPanel;
