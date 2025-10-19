import { useCallback, useEffect, useRef, useState } from "react";
import { DragDropFacade } from "../modules/drag-drop-module/drag-drop-facade";

type InputPanelProps = {
  readonly draft: string;
  readonly onSubmit: (text: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 200;

const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) {
    return;
  }

  const element = textarea;
  element.style.height = "auto";
  const { scrollHeight } = element;
  const targetHeight = Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT);
  element.style.height = `${targetHeight}px`;
};

const focusTextareaEnd = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) {
    return;
  }

  const element = textarea;
  element.focus();
  const length = element.value.length;
  element.setSelectionRange(length, length);
};

const InputPanel = ({ draft, onSubmit }: InputPanelProps) => {
  const [value, setValue] = useState(draft);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dropContainerRef = useRef<HTMLDivElement | null>(null);
  const dragDropFacadeRef = useRef<DragDropFacade | null>(null);

  const updateValue = useCallback((nextValue: string) => {
    setValue(nextValue);
    requestAnimationFrame(() => {
      adjustTextareaHeight(textareaRef.current);
    });
  }, []);

  useEffect(() => {
    updateValue(draft);
  }, [draft, updateValue]);

  const sendMessage = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    updateValue("");
  }, [onSubmit, updateValue, value]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      sendMessage();
    },
    [sendMessage]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const nativeEvent = event.nativeEvent as KeyboardEvent;
      if (nativeEvent.isComposing) {
        return;
      }

      event.preventDefault();
      sendMessage();
    },
    [sendMessage]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateValue(event.target.value);
    },
    [updateValue]
  );

  const applyExternalValue = useCallback(
    (newValue: string) => {
      updateValue(newValue);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        focusTextareaEnd(textarea);
      });
    },
    [updateValue]
  );

  useEffect(() => {
    const container = dropContainerRef.current;
    const textarea = textareaRef.current;
    if (!(container && textarea)) {
      return;
    }

    const dragDropFacade = new DragDropFacade();
    dragDropFacadeRef.current = dragDropFacade;

    dragDropFacade.initialize({
      container,
      onValueChange: applyExternalValue,
      getCurrentValue: () => textarea.value,
      onDragStateChange: setIsDragging,
    });

    return () => {
      dragDropFacade.destroy();
      dragDropFacadeRef.current = null;
    };
  }, [applyExternalValue]);

  const overlayLabel = "Drop files here while holding Shift";

  return (
    <form
      aria-label="Message input"
      className="session-input session-panel"
      onSubmit={handleSubmit}
    >
      <div
        className={[
          "session-input__container",
          isDragging ? "session-input__container--dragging" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={dropContainerRef}
      >
        <textarea
          aria-multiline="true"
          className={[
            "session-input__textarea",
            isFocused ? "session-input__textarea--focused" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type your request or drag files with Shift held..."
          ref={textareaRef}
          rows={1}
          value={value}
        />

        {isDragging && (
          <output className="session-input__overlay">{overlayLabel}</output>
        )}
      </div>

      <div className="session-input__footer">
        <span className="session-input__hint">
          Press Enter to send, Shift+Enter for a new line
        </span>
      </div>
    </form>
  );
};

export default InputPanel;
