import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_DRAG_OVERLAY_LABEL, useInputDragDrop } from "./input-dnd";
import { createClipboardHandlers } from "./input-panel-clipboard";

interface InputTextareaClasses {
  readonly container: string;
  readonly containerDragging: string;
  readonly overlay: string;
  readonly textarea: string;
  readonly textareaFocused: string;
}

interface InputTextareaProps {
  readonly classes?: Partial<InputTextareaClasses>;
  readonly maxHeight?: number;
  readonly onSubmit?: () => void;
  readonly onValueChange: (nextValue: string) => void;
  readonly overlayLabel?: string;
  readonly overlaySlot?: ReactNode;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly value: string;
}

const DEFAULT_CLASSES: InputTextareaClasses = {
  container: "",
  containerDragging: "",
  textarea: "",
  textareaFocused: "",
  overlay: "",
};

const adjustTextareaHeight = (
  textarea: HTMLTextAreaElement | null,
  maxHeight?: number
) => {
  if (!textarea) {
    return;
  }

  const element = textarea;
  element.style.height = "auto";
  const { scrollHeight } = element;
  const targetHeight =
    typeof maxHeight === "number"
      ? Math.min(scrollHeight, maxHeight)
      : scrollHeight;
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

export const InputTextarea = ({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  rows = 1,
  maxHeight,
  overlayLabel = DEFAULT_DRAG_OVERLAY_LABEL,
  overlaySlot,
  classes,
}: InputTextareaProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dropContainerRef = useRef<HTMLDivElement | null>(null);

  const resolvedClasses = { ...DEFAULT_CLASSES, ...classes };

  const applyExternalValue = useCallback(
    (newValue: string) => {
      onValueChange(newValue);
      requestAnimationFrame(() => {
        focusTextareaEnd(textareaRef.current);
        adjustTextareaHeight(textareaRef.current, maxHeight);
      });
    },
    [maxHeight, onValueChange]
  );

  const { isDragging } = useInputDragDrop({
    containerRef: dropContainerRef,
    textareaRef,
    onValueChange: applyExternalValue,
  });

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onValueChange(event.target.value);
    },
    [onValueChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!onSubmit || event.key !== "Enter") {
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
      onSubmit();
    },
    [onSubmit]
  );

  const insertTextAtSelection = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const [selectionStart, selectionEnd] = [
        textarea.selectionStart ?? textarea.value.length,
        textarea.selectionEnd ?? textarea.value.length,
      ];

      const currentValue = textarea.value;
      const nextValue =
        currentValue.slice(0, selectionStart) +
        text +
        currentValue.slice(selectionEnd);

      onValueChange(nextValue);
      requestAnimationFrame(() => {
        const position = selectionStart + text.length;
        textarea.selectionStart = position;
        textarea.selectionEnd = position;
        adjustTextareaHeight(textarea, maxHeight);
        textarea.focus();
      });
    },
    [maxHeight, onValueChange]
  );

  const syncTextareaValue = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    onValueChange(textarea.value);
  }, [onValueChange]);

  const { handlePaste, handleCopy } = useMemo(
    () =>
      createClipboardHandlers({
        textareaRef,
        insertTextAtSelection,
        syncTextareaValue,
      }),
    [insertTextAtSelection, syncTextareaValue]
  );

  useEffect(() => {
    const nextValue = value;
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea || textarea.value !== nextValue) {
        return;
      }
      adjustTextareaHeight(textarea, maxHeight);
    });
  }, [maxHeight, value]);

  const containerClassName = [
    resolvedClasses.container,
    isDragging ? resolvedClasses.containerDragging : "",
  ]
    .filter(Boolean)
    .join(" ");

  const textareaClassName = [
    resolvedClasses.textarea,
    isFocused ? resolvedClasses.textareaFocused : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName} ref={dropContainerRef}>
      <textarea
        aria-multiline="true"
        className={textareaClassName}
        onBlur={() => setIsFocused(false)}
        onChange={handleChange}
        onCopy={handleCopy}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        ref={textareaRef}
        rows={rows}
        value={value}
      />

      {overlaySlot}

      {isDragging && (
        <output className={resolvedClasses.overlay}>{overlayLabel}</output>
      )}
    </div>
  );
};
