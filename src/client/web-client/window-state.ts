const WINDOW_STATE_STORAGE_KEY = "codeaiHubStandaloneWindowState";
const MIN_WINDOW_WIDTH = 960;
const MIN_WINDOW_HEIGHT = 640;
const MAX_WINDOW_WIDTH = 4096;
const MAX_WINDOW_HEIGHT = 2304;

type StoredWindowState = {
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (min > max) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const readStorage = (): Storage | null => {
  try {
    if ("localStorage" in window) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
};

const parseWindowState = (raw: string | null): StoredWindowState | null => {
  if (!raw) {
    return null;
  }

  try {
    const candidate = JSON.parse(raw) as Partial<StoredWindowState>;

    if (
      typeof candidate?.width === "number" &&
      Number.isFinite(candidate.width) &&
      typeof candidate?.height === "number" &&
      Number.isFinite(candidate.height) &&
      typeof candidate?.x === "number" &&
      Number.isFinite(candidate.x) &&
      typeof candidate?.y === "number" &&
      Number.isFinite(candidate.y)
    ) {
      return {
        width: candidate.width,
        height: candidate.height,
        x: candidate.x,
        y: candidate.y,
      };
    }
  } catch {
    // ignore malformed payloads
  }

  return null;
};

const computeSafeDimensions = (
  candidateWidth: number,
  candidateHeight: number
): { readonly width: number; readonly height: number } => {
  const availWidth = window.screen?.availWidth ?? candidateWidth;
  const availHeight = window.screen?.availHeight ?? candidateHeight;

  const width = clamp(
    Math.round(candidateWidth),
    MIN_WINDOW_WIDTH,
    Math.max(MIN_WINDOW_WIDTH, Math.min(availWidth, MAX_WINDOW_WIDTH))
  );
  const height = clamp(
    Math.round(candidateHeight),
    MIN_WINDOW_HEIGHT,
    Math.max(MIN_WINDOW_HEIGHT, Math.min(availHeight, MAX_WINDOW_HEIGHT))
  );

  return { width, height };
};

export const restoreStandaloneWindowState = (): void => {
  const storage = readStorage();
  if (!storage) {
    return;
  }

  const storedState = parseWindowState(
    storage.getItem(WINDOW_STATE_STORAGE_KEY)
  );
  if (!storedState) {
    return;
  }

  const { width, height } = computeSafeDimensions(
    storedState.width,
    storedState.height
  );
  const availLeft =
    (window.screen as typeof window.screen & { availLeft?: number })
      ?.availLeft ?? 0;
  const availTop =
    (window.screen as typeof window.screen & { availTop?: number })?.availTop ??
    0;
  const availWidth = window.screen?.availWidth ?? width;
  const availHeight = window.screen?.availHeight ?? height;

  const maxX = availLeft + availWidth - width;
  const maxY = availTop + availHeight - height;

  const x = clamp(Math.round(storedState.x), availLeft, maxX);
  const y = clamp(Math.round(storedState.y), availTop, maxY);

  try {
    window.resizeTo(width, height);
    window.moveTo(x, y);
  } catch {
    // If the browser blocks moving/resizing, fall back silently.
  }
};

export const persistStandaloneWindowState = (): void => {
  const storage = readStorage();
  if (!storage) {
    return;
  }

  const widthCandidate =
    window.outerWidth || window.innerWidth || MIN_WINDOW_WIDTH;
  const heightCandidate =
    window.outerHeight || window.innerHeight || MIN_WINDOW_HEIGHT;

  const { width, height } = computeSafeDimensions(
    widthCandidate,
    heightCandidate
  );

  const state: StoredWindowState = {
    width,
    height,
    x: Math.round(window.screenX ?? window.screenLeft ?? 0),
    y: Math.round(window.screenY ?? window.screenTop ?? 0),
  };

  try {
    storage.setItem(WINDOW_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence failures are non-fatal.
  }
};
