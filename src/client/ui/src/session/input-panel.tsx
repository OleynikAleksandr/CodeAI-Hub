import { useCallback, useEffect, useState } from "react";
import { InputTextarea } from "./input-textarea";

type InputPanelProps = {
  readonly draft: string;
  readonly connectionState?: "idle" | "running" | "blocked";
  readonly onSubmit: (text: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 200;

const InputPanel = ({
  draft,
  connectionState = "idle",
  onSubmit,
}: InputPanelProps) => {
  const isBlocked = connectionState !== "idle";
  const hint = (() => {
    if (connectionState === "blocked") {
      return "Preparing continuation…";
    }
    if (connectionState === "running") {
      return "Waiting for the agent…";
    }
    return "Press Enter to send, Shift+Enter for a new line";
  })();
  const [value, setValue] = useState(draft);

  useEffect(() => {
    setValue(draft);
  }, [draft]);

  const sendMessage = useCallback(() => {
    if (isBlocked) {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setValue("");
  }, [isBlocked, onSubmit, value]);

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
        disabled={isBlocked}
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
          placeholder="Type your request or drag files with Shift held..."
          value={value}
        />
      </fieldset>

      <div className="session-input__footer">
        <span className="session-input__hint">{hint}</span>
      </div>
    </form>
  );
};

export default InputPanel;
