import type { ClipboardEvent, RefObject } from "react";

type ClipboardHandlersConfig = {
  readonly textareaRef: RefObject<HTMLTextAreaElement>;
  readonly insertTextAtSelection: (text: string) => void;
  readonly syncTextareaValue: () => void;
};

const WINDOWS_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;

const LINE_SPLIT_REGEX = /\r?\n/;

const normalizePathCandidate = (rawValue: string): string | null => {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("file://")) {
    const withoutScheme = value.replace("file://", "");
    try {
      return decodeURIComponent(withoutScheme);
    } catch {
      return withoutScheme;
    }
  }

  if (
    value.startsWith("/") ||
    value.startsWith("~") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    WINDOWS_PATH_PATTERN.test(value)
  ) {
    return value;
  }

  return null;
};

const formatPathsForInsertion = (paths: readonly string[]): string => {
  if (paths.length === 0) {
    return "";
  }
  return `${paths.map((path) => `"${path}"`).join("\n")}\n`;
};

const pushUnique = (target: string[], value: string) => {
  if (!target.includes(value)) {
    target.push(value);
  }
};

const collectPathsFromUriList = (results: string[], payload: string) => {
  for (const line of payload.split(LINE_SPLIT_REGEX)) {
    const normalized = normalizePathCandidate(line);
    if (normalized) {
      pushUnique(results, normalized);
    }
  }
};

const collectPathsFromFileList = (
  results: string[],
  files: FileList | null | undefined
) => {
  if (!files || files.length === 0) {
    return;
  }

  for (const file of Array.from(files)) {
    const candidate = (file as File & { path?: string }).path;
    if (!candidate) {
      continue;
    }
    const normalized = normalizePathCandidate(candidate);
    if (normalized) {
      pushUnique(results, normalized);
    }
  }
};

const collectPathsFromItems = (
  results: string[],
  items: DataTransferItemList | undefined
) => {
  if (typeof items === "undefined") {
    return;
  }

  for (const item of Array.from(items)) {
    if (item.kind !== "file") {
      continue;
    }
    const file = item.getAsFile();
    const candidate = (file as (File & { path?: string }) | null)?.path;
    if (!candidate) {
      continue;
    }
    const normalized = normalizePathCandidate(candidate);
    if (normalized) {
      pushUnique(results, normalized);
    }
  }
};

const extractFilePathsFromClipboardData = (
  dataTransfer: DataTransfer
): string[] => {
  const results: string[] = [];

  const uriListPayload =
    dataTransfer.getData("application/vnd.code.uri-list") ||
    dataTransfer.getData("text/uri-list");
  if (uriListPayload) {
    collectPathsFromUriList(results, uriListPayload);
  }

  collectPathsFromFileList(results, dataTransfer.files);
  collectPathsFromItems(results, dataTransfer.items);

  return results;
};

const handlePlainTextPaste = (
  event: ClipboardEvent<HTMLTextAreaElement>,
  insertText: (text: string) => void
): boolean => {
  const dataTransfer = event.clipboardData;
  if (!dataTransfer) {
    return false;
  }

  const filePaths = extractFilePathsFromClipboardData(dataTransfer);
  if (filePaths.length > 0) {
    event.preventDefault();
    insertText(formatPathsForInsertion(filePaths));
    return true;
  }

  const plainText = dataTransfer.getData("text/plain");
  if (plainText) {
    const normalized = normalizePathCandidate(plainText);
    if (normalized) {
      event.preventDefault();
      insertText(formatPathsForInsertion([normalized]));
      return true;
    }

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
