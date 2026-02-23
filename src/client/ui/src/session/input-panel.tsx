import { useCallback, useEffect, useRef, useState } from "react";
import { requestCoreFromSupervisor } from "../core-bridge/supervisor-requests";
import type { ProviderTheme } from "./helpers";
import { resolveProviderWaitColor } from "./helpers";
import InputPlayStopButton from "./input-play-stop-button";
import { InputTextarea } from "./input-textarea";
import type { TaskTimerSnapshot } from "./task-timer";
import { TaskTimer } from "./task-timer";

type InputPanelProps = {
  readonly draft: string;
  readonly connectionState?: "idle" | "running" | "blocked";
  readonly continuityLockActive?: boolean;
  readonly continuityErrorCopy?: string | null;
  readonly isQueued?: boolean;
  readonly providerTheme?: ProviderTheme | null;
  readonly terminalNoResume?: boolean;
  readonly taskTimer?: TaskTimerSnapshot | null;
  readonly onSubmit: (text: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 200;

const resolvePlaceholder = (options: {
  readonly isQueued: boolean;
  readonly terminalNoResume: boolean;
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

const InputPanel = ({
  draft,
  connectionState = "idle",
  continuityLockActive = false,
  continuityErrorCopy = null,
  isQueued = false,
  providerTheme = null,
  terminalNoResume = false,
  taskTimer = null,
  onSubmit,
}: InputPanelProps) => {
  const [forceUnlocked, setForceUnlocked] = useState(false);
  const [optimisticStopActive, setOptimisticStopActive] = useState(false);

  const inputLocked =
    (connectionState !== "idle" ||
      continuityLockActive ||
      isQueued ||
      terminalNoResume) &&
    !forceUnlocked;
  const agentBusy =
    !terminalNoResume &&
    (connectionState !== "idle" || continuityLockActive || isQueued);
  const waitCopyActive = inputLocked && !isQueued && !terminalNoResume;
  const waitCopyColor = resolveProviderWaitColor(providerTheme, 0.7);
  const waitCopySolidColor = resolveProviderWaitColor(providerTheme, 1);
  const formClassName = [
    "session-input",
    "session-panel",
    waitCopyActive ? "session-input--wait-copy" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const placeholder = resolvePlaceholder({
    isQueued,
    terminalNoResume,
    connectionState,
    continuityLockActive,
    continuityErrorCopy,
  });

  const [value, setValue] = useState(draft);
  const formRef = useRef<HTMLFormElement | null>(null);

  const waitCopyOverlayActive = waitCopyActive && value.length === 0;

  useEffect(() => {
    setValue(draft);
  }, [draft]);

  useEffect(() => {
    if (optimisticStopActive && agentBusy) {
      setOptimisticStopActive(false);
      return;
    }

    if (
      optimisticStopActive &&
      connectionState === "idle" &&
      !continuityLockActive &&
      !isQueued
    ) {
      setOptimisticStopActive(false);
    }
  }, [
    agentBusy,
    connectionState,
    continuityLockActive,
    isQueued,
    optimisticStopActive,
  ]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    form.style.setProperty("--session-input-wait-color", waitCopyColor);
    form.style.setProperty(
      "--session-input-wait-solid-color",
      waitCopySolidColor
    );
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
  }, [waitCopyActive, waitCopyColor, waitCopySolidColor]);

  const sendMessage = useCallback(() => {
    if (inputLocked) {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setForceUnlocked(false);
    setOptimisticStopActive(true);
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
    if (!(inputLocked && agentBusy)) {
      return null;
    }
    if (taskTimer?.runningSinceMs == null) {
      return null;
    }

    return (
      <TaskTimer
        active={agentBusy}
        mode="turn"
        placement="overlay"
        theme={providerTheme}
        timer={taskTimer}
      />
    );
  };

  const renderWaitCopyOverlay = () => {
    if (!waitCopyOverlayActive) {
      return null;
    }

    return (
      <output aria-hidden="true" className="session-input__wait-copy-overlay">
        {placeholder}
      </output>
    );
  };

  const renderFooterTotal = () => (
    <div className="session-input__total">
      <span className="session-input__total-label">{"total:\u00a0\u00a0"}</span>
      <TaskTimer
        active={agentBusy}
        mode="total"
        placement="footer"
        theme={providerTheme}
        timer={taskTimer}
      />
    </div>
  );

  const stopActive = (agentBusy || optimisticStopActive) && !forceUnlocked;

  const handleActionClick = useCallback(() => {
    if (stopActive) {
      requestCoreFromSupervisor("restart");
      setForceUnlocked(true);
      setOptimisticStopActive(false);
      return;
    }

    sendMessage();
  }, [sendMessage, stopActive]);

  return (
    <form
      aria-label="Message input"
      className={formClassName}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="session-input__row">
        <fieldset
          disabled={inputLocked}
          style={{
            border: 0,
            padding: 0,
            margin: 0,
            flex: "1 1 auto",
            minWidth: 0,
          }}
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
            overlaySlot={
              <>
                {renderOverlayTimer()}
                {renderWaitCopyOverlay()}
              </>
            }
            placeholder={placeholder}
            value={value}
          />
        </fieldset>

        <InputPlayStopButton
          onClick={handleActionClick}
          stopActive={stopActive}
        />
      </div>

      <div className="session-input__footer">
        <span
          className="session-input__hint"
          style={inputLocked ? { visibility: "hidden" } : undefined}
        >
          Press Enter to send, Shift+Enter for a new line
        </span>
        <div className="session-input__footer-right">{renderFooterTotal()}</div>
      </div>
    </form>
  );
};

export default InputPanel;
