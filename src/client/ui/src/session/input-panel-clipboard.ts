import type { ClipboardEvent, RefObject } from "react";

type ClipboardHandlersConfig = {
  readonly textareaRef: RefObject<HTMLTextAreaElement>;
  readonly insertTextAtSelection: (text: string) => void;
  readonly syncTextareaValue: () => void;
};

const handlePlainTextPaste = (
  event: ClipboardEvent<HTMLTextAreaElement>,
  insertText: (text: string) => void
): boolean => {
  const dataTransfer = event.clipboardData;
  if (!dataTransfer) {
    return false;
  }

  const plainText = dataTransfer.getData("text/plain");
  if (plainText) {
    event.preventDefault();
    insertText(plainText);
    return true;
  }

  if (typeof dataTransfer.items !== "undefined") {
    const stringItem = Array.from(dataTransfer.items).find(
      (item) => item.kind === "string"
    );
    if (stringItem) {
      event.preventDefault();
      stringItem.getAsString((text) => {
        if (text) {
          insertText(text);
        }
      });
      return true;
    }
  }

  return false;
};

const tryReadFromNavigator = async (
  insertText: (text: string) => void
): Promise<boolean> => {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.readText !== "function"
  ) {
    return false;
  }

  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      insertText(text);
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

const copySelectionToClipboard = (
  event: ClipboardEvent<HTMLTextAreaElement>,
  textarea: HTMLTextAreaElement,
  selection: string
): void => {
  if (event.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData("text/plain", selection);
    return;
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    event.preventDefault();
    navigator.clipboard.writeText(selection).catch(() => {
      /* ignore clipboard errors */
    });
    return;
  }

  textarea.select();
};

export const createClipboardHandlers = ({
  textareaRef,
  insertTextAtSelection,
  syncTextareaValue,
}: ClipboardHandlersConfig) => {
  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const handled = handlePlainTextPaste(event, insertTextAtSelection);
    if (handled) {
      return;
    }

    tryReadFromNavigator(insertTextAtSelection)
      .then((success) => {
        if (success) {
          return;
        }

        requestAnimationFrame(syncTextareaValue);
      })
      .catch(() => {
        requestAnimationFrame(syncTextareaValue);
      });
  };

  const handleCopy = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    if (start === end) {
      return;
    }

    const selection = textarea.value.slice(start, end);
    if (!selection) {
      return;
    }

    copySelectionToClipboard(event, textarea, selection);
  };

  return {
    handlePaste,
    handleCopy,
  };
};
