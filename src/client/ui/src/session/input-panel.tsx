import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderTheme } from "./helpers";
import { resolveProviderWaitColor } from "./helpers";
import { InputTextarea } from "./input-textarea";
import { TaskTimer } from "./task-timer";

type InputPanelProps = {
  readonly draft: string;
  readonly connectionState?: "idle" | "running" | "blocked";
  readonly continuityLockActive?: boolean;
  readonly continuityErrorCopy?: string | null;
  readonly isQueued?: boolean;
  readonly providerTheme?: ProviderTheme | null;
  readonly terminalNoResume?: boolean;
  readonly forceUnlocked?: boolean;
  readonly agentTimerKey?: string | null;
  readonly onForceUnlock?: () => void;
  readonly onRelock?: () => void;
  readonly onSubmit: (text: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 200;

const resolvePlaceholder = (options: {
  readonly isQueued: boolean;
  readonly terminalNoResume: boolean;
  readonly forceUnlocked: boolean;
  readonly connectionState: string;
  readonly continuityLockActive: boolean;
  readonly continuityErrorCopy: string | null;
}): string => {
  if (options.isQueued) {
    return "Message queued. Sending as soon as it is ready…";
  }
  if (options.terminalNoResume) {
    return "This session is complete and read-only.";
  }
  if (options.forceUnlocked) {
    return "Type your request or drag files with Shift held...";
  }
  if (options.connectionState === "running") {
    return "Agent is working… Please wait.";
  }
  if (options.continuityLockActive || options.connectionState === "blocked") {
    return "Agent is resuming your session… Please wait.";
  }
  if (options.continuityErrorCopy) {
    return `Continuity failed: ${options.continuityErrorCopy}`;
  }
  return "Type your request or drag files with Shift held...";
};

type LockToggleConfig = {
  readonly handler?: (() => void) | undefined;
  readonly title: string;
  readonly icon: string;
};

const resolveLockToggleConfig = (options: {
  readonly forceUnlocked: boolean;
  readonly onForceUnlock?: () => void;
  readonly onRelock?: () => void;
}): LockToggleConfig => ({
  handler: options.forceUnlocked ? options.onRelock : options.onForceUnlock,
  title: options.forceUnlocked ? "Re-lock input" : "Force unlock input",
  icon: options.forceUnlocked ? "🔓" : "🔒",
});

const InputPanel = ({
  draft,
  connectionState = "idle",
  continuityLockActive = false,
  continuityErrorCopy = null,
  isQueued = false,
  providerTheme = null,
  terminalNoResume = false,
  forceUnlocked = false,
  agentTimerKey = null,
  onForceUnlock,
  onRelock,
  onSubmit,
}: InputPanelProps) => {
  const inputLocked =
    !forceUnlocked &&
    (connectionState !== "idle" || continuityLockActive || isQueued);
  const agentBusy =
    !terminalNoResume &&
    (connectionState !== "idle" || continuityLockActive || isQueued);
  const waitCopyActive = inputLocked && !isQueued;
  const waitCopyColor = resolveProviderWaitColor(providerTheme);
  const formClassName = "session-input session-panel";
  const placeholder = resolvePlaceholder({
    isQueued,
    terminalNoResume,
    forceUnlocked,
    connectionState,
    continuityLockActive,
    continuityErrorCopy,
  });

  const showLockToggle =
    !terminalNoResume &&
    (inputLocked || forceUnlocked) &&
    (onForceUnlock != null || onRelock != null);

  const [value, setValue] = useState(draft);
  const formRef = useRef<HTMLFormElement | null>(null);
  const lockToggleConfig = resolveLockToggleConfig({
    forceUnlocked,
    onForceUnlock,
    onRelock,
  });

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

  const renderOverlayTimer = () => {
    if (!(inputLocked && agentTimerKey)) {
      return null;
    }

    return (
      <TaskTimer
        active={agentBusy}
        placement="overlay"
        storageKey={agentTimerKey}
        theme={providerTheme}
      />
    );
  };

  const renderFooterTimer = () => {
    if (inputLocked || !agentTimerKey) {
      return null;
    }

    return (
      <TaskTimer
        active={agentBusy}
        placement="footer"
        storageKey={agentTimerKey}
        theme={providerTheme}
      />
    );
  };

  const renderLockToggle = () => {
    if (!(showLockToggle && lockToggleConfig.handler)) {
      return null;
    }

    return (
      <button
        className="session-input__lock-toggle"
        onClick={lockToggleConfig.handler}
        title={lockToggleConfig.title}
        type="button"
      >
        {lockToggleConfig.icon}
      </button>
    );
  };

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
          overlaySlot={renderOverlayTimer()}
          placeholder={placeholder}
          value={value}
        />
      </fieldset>

      <div className="session-input__footer">
        <span
          className="session-input__hint"
          style={inputLocked ? { visibility: "hidden" } : undefined}
        >
          Press Enter to send, Shift+Enter for a new line
        </span>
        <div className="session-input__footer-right">
          {renderLockToggle()}
          {renderFooterTimer()}
        </div>
      </div>
    </form>
  );
};

export default InputPanel;
