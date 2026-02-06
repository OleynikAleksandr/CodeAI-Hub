import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInputLockMatrixRain,
  type InputLockMatrixRainController,
} from "./input-lock-matrix-rain";
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
  const inputLocked = connectionState !== "idle" || isQueued;
  const matrixActive =
    connectionState === "running" || connectionState === "blocked";
  const formClassName = [
    "session-input",
    matrixActive ? "session-input--matrix-active" : "",
    "session-panel",
  ]
    .filter(Boolean)
    .join(" ");
  const placeholder = (() => {
    if (isQueued) {
      return "Message queued. Sending as soon as it is ready…";
    }
    if (continuityLockActive || connectionState === "blocked") {
      return "Agent is resuming your session… Please wait.";
    }
    if (connectionState === "running") {
      return "Agent is working… Please wait.";
    }
    return "Type your request or drag files with Shift held...";
  })();
  const [value, setValue] = useState(draft);
  const formRef = useRef<HTMLFormElement | null>(null);
  const matrixRainRef = useRef<InputLockMatrixRainController | null>(null);

  useEffect(() => {
    setValue(draft);
  }, [draft]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const container = form.querySelector<HTMLElement>(
      ".session-input__container"
    );
    if (!container) {
      return;
    }

    const controller = createInputLockMatrixRain(container);
    matrixRainRef.current = controller;
    return () => {
      controller.dispose();
      matrixRainRef.current = null;
    };
  }, []);

  useEffect(() => {
    matrixRainRef.current?.setActive(matrixActive);
  }, [matrixActive]);

  const sendMessage = useCallback(() => {
    if (inputLocked) {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setValue("");
  }, [inputLocked, onSubmit, value]);

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
      className={formClassName}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <fieldset
        disabled={inputLocked}
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

      {inputLocked ? null : (
        <div className="session-input__footer">
          <span className="session-input__hint">
            Press Enter to send, Shift+Enter for a new line
          </span>
        </div>
      )}
    </form>
  );
};

export default InputPanel;
