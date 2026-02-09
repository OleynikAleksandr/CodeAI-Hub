import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderTheme } from "./helpers";
import { resolveProviderWaitColor } from "./helpers";
import { InputTextarea } from "./input-textarea";

type InputPanelProps = {
  readonly draft: string;
  readonly connectionState?: "idle" | "running" | "blocked";
  readonly continuityLockActive?: boolean;
  readonly isQueued?: boolean;
  readonly providerTheme?: ProviderTheme | null;
  readonly onSubmit: (text: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 200;

const InputPanel = ({
  draft,
  connectionState = "idle",
  continuityLockActive = false,
  isQueued = false,
  providerTheme = null,
  onSubmit,
}: InputPanelProps) => {
  const inputLocked =
    connectionState !== "idle" || continuityLockActive || isQueued;
  const waitCopyActive = inputLocked && !isQueued;
  const waitCopyColor = resolveProviderWaitColor(providerTheme);
  const formClassName = "session-input session-panel";
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

  useEffect(() => {
    setValue(draft);
  }, [draft]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    form.style.setProperty("--session-input-wait-color", waitCopyColor);
    const textarea = form.querySelector<HTMLTextAreaElement>(
      ".session-input__textarea"
    );
    if (!textarea) {
      return;
    }

    if (!waitCopyActive) {
      textarea.style.removeProperty("color");
      textarea.style.removeProperty("caret-color");
      return;
    }

    textarea.style.setProperty("color", waitCopyColor);
    textarea.style.setProperty("caret-color", waitCopyColor);
  }, [waitCopyActive, waitCopyColor]);

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

      <div
        className="session-input__footer"
        style={inputLocked ? { visibility: "hidden" } : undefined}
      >
        <span className="session-input__hint">
          Press Enter to send, Shift+Enter for a new line
        </span>
      </div>
    </form>
  );
};

export default InputPanel;
