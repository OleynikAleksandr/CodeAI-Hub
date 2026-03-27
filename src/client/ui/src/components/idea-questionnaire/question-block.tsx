import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DRAG_OVERLAY_LABEL,
  useInputDragDrop,
} from "../../session/input-dnd";
import { createClipboardHandlers } from "../../session/input-panel-clipboard";
import {
  questionCardStyles,
  questionDescriptionStyles,
  questionHeaderStyles,
  questionHintStyles,
  questionInputShellDraggingStyles,
  questionInputShellFocusedStyles,
  questionInputShellStyles,
  questionOverlayStyles,
  questionTextareaStyles,
  questionTitleHintStyles,
  questionTitleRowStyles,
  questionTitleStyles,
} from "./styles";

export interface QuestionnaireQuestion {
  readonly description?: string;
  readonly hint?: string;
  readonly id: string;
  readonly title: string;
  readonly titleHint?: string;
}

interface QuestionBlockProps {
  readonly onChange: (questionId: string, value: string) => void;
  readonly question: QuestionnaireQuestion;
  readonly value: string;
}

const BASE_MIN_HEIGHT = 96;

const focusTextareaEnd = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) {
    return;
  }

  const element = textarea;
  element.focus();
  const length = element.value.length;
  element.setSelectionRange(length, length);
};

export const QuestionBlock = ({
  question,
  value,
  onChange,
}: QuestionBlockProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [userMinHeight, setUserMinHeight] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastWidthRef = useRef<number | null>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const minHeight = userMinHeight ?? BASE_MIN_HEIGHT;
    textarea.style.height = "auto";
    textarea.style.minHeight = `${minHeight}px`;
    const targetHeight = Math.max(textarea.scrollHeight, minHeight);
    textarea.style.height = `${targetHeight}px`;
  }, [userMinHeight]);

  const applyExternalValue = useCallback(
    (nextValue: string) => {
      onChange(question.id, nextValue);
      requestAnimationFrame(() => {
        focusTextareaEnd(textareaRef.current);
        adjustTextareaHeight();
      });
    },
    [adjustTextareaHeight, onChange, question.id]
  );

  const { isDragging } = useInputDragDrop({
    containerRef,
    textareaRef,
    onValueChange: applyExternalValue,
  });

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(question.id, event.target.value);
    },
    [onChange, question.id]
  );

  const handleResizeCommit = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const nextMinHeight = Math.max(
      userMinHeight ?? BASE_MIN_HEIGHT,
      textarea.offsetHeight
    );
    if (nextMinHeight !== (userMinHeight ?? BASE_MIN_HEIGHT)) {
      setUserMinHeight(nextMinHeight);
    }
  }, [userMinHeight]);

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

      onChange(question.id, nextValue);
      requestAnimationFrame(() => {
        const position = selectionStart + text.length;
        textarea.selectionStart = position;
        textarea.selectionEnd = position;
        adjustTextareaHeight();
        textarea.focus();
      });
    },
    [adjustTextareaHeight, onChange, question.id]
  );

  const syncTextareaValue = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    onChange(question.id, textarea.value);
  }, [onChange, question.id]);

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
      adjustTextareaHeight();
    });
  }, [adjustTextareaHeight, value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const nextWidth = entry.contentRect.width;
      if (lastWidthRef.current !== nextWidth) {
        lastWidthRef.current = nextWidth;
        adjustTextareaHeight();
      }
    });

    observer.observe(textarea);
    return () => observer.disconnect();
  }, [adjustTextareaHeight]);

  const inputShellStyles = {
    ...questionInputShellStyles,
    ...(isDragging ? questionInputShellDraggingStyles : {}),
    ...(isFocused ? questionInputShellFocusedStyles : {}),
  };

  return (
    <section style={questionCardStyles}>
      <div style={questionHeaderStyles}>
        <div style={questionTitleRowStyles}>
          <span style={questionTitleStyles}>{question.title}</span>
          {question.titleHint ? (
            <span style={questionTitleHintStyles}>{question.titleHint}</span>
          ) : null}
        </div>
        {question.description ? (
          <p style={questionDescriptionStyles}>{question.description}</p>
        ) : null}
        {question.hint ? (
          <p style={questionHintStyles}>{question.hint}</p>
        ) : null}
      </div>
      <div ref={containerRef} style={inputShellStyles}>
        <textarea
          aria-label={question.title}
          onBlur={() => {
            setIsFocused(false);
            handleResizeCommit();
          }}
          onChange={handleChange}
          onCopy={handleCopy}
          onFocus={() => setIsFocused(true)}
          onMouseUp={handleResizeCommit}
          onPaste={handlePaste}
          onTouchEnd={handleResizeCommit}
          ref={textareaRef}
          rows={1}
          style={questionTextareaStyles}
          value={value}
        />
        {isDragging ? (
          <output style={questionOverlayStyles}>
            {DEFAULT_DRAG_OVERLAY_LABEL}
          </output>
        ) : null}
      </div>
    </section>
  );
};
