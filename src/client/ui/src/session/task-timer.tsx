import { useEffect, useMemo, useState } from "react";
import type { ProviderTheme } from "./helpers";
import { FlipClock } from "./task-timer-flip-clock";

type TaskTimerPlacement = "overlay" | "footer";

type TaskTimerProps = {
  readonly storageKey: string | null;
  readonly active: boolean;
  readonly placement: TaskTimerPlacement;
  readonly theme?: ProviderTheme | null;
};

type StoredTaskTimerState = {
  readonly totalSeconds: number;
  readonly runningSinceSec: number | null;
  readonly updatedAtMs: number;
};

const FLIP_TICK_MS = 250;

const getNowSec = (): number => Math.floor(Date.now() / 1000);

const clampPositiveInteger = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value < 0) {
    return null;
  }
  return Math.floor(value);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getLocalStorage = (): Storage | null => {
  try {
    return "localStorage" in globalThis ? globalThis.localStorage : null;
  } catch {
    return null;
  }
};

const parseStoredTaskTimerState = (
  raw: string
): StoredTaskTimerState | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }

  const totalSeconds = clampPositiveInteger(parsed.totalSeconds);
  const updatedAtMs = clampPositiveInteger(parsed.updatedAtMs);
  if (totalSeconds === null || updatedAtMs === null) {
    return null;
  }

  const runningSinceCandidate = parsed.runningSinceSec;
  const runningSinceSec =
    runningSinceCandidate === null
      ? null
      : clampPositiveInteger(runningSinceCandidate);

  return {
    totalSeconds,
    runningSinceSec: runningSinceSec ?? null,
    updatedAtMs,
  };
};

const readStoredTaskTimerState = (storageKey: string): StoredTaskTimerState => {
  const storage = getLocalStorage();
  if (!storage) {
    return { totalSeconds: 0, runningSinceSec: null, updatedAtMs: 0 };
  }
  const raw = storage.getItem(storageKey);
  if (!raw) {
    return { totalSeconds: 0, runningSinceSec: null, updatedAtMs: 0 };
  }
  return (
    parseStoredTaskTimerState(raw) ?? {
      totalSeconds: 0,
      runningSinceSec: null,
      updatedAtMs: 0,
    }
  );
};

const writeStoredTaskTimerState = (
  storageKey: string,
  state: StoredTaskTimerState
): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  const payload: StoredTaskTimerState = {
    totalSeconds: Math.max(0, Math.floor(state.totalSeconds)),
    runningSinceSec:
      state.runningSinceSec === null
        ? null
        : Math.max(0, Math.floor(state.runningSinceSec)),
    updatedAtMs: Date.now(),
  };

  try {
    storage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // ignore quota / permission errors
  }
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const formatHms = (totalSeconds: number): string => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const hoursText = hours < 100 ? pad2(hours) : String(hours);
  return `${hoursText}:${pad2(minutes)}:${pad2(seconds)}`;
};

export const TaskTimer = ({
  storageKey,
  active,
  placement,
  theme = null,
}: TaskTimerProps) => {
  const [stored, setStored] = useState<StoredTaskTimerState>(() => {
    if (!storageKey) {
      return { totalSeconds: 0, runningSinceSec: null, updatedAtMs: 0 };
    }
    return readStoredTaskTimerState(storageKey);
  });
  const [nowSec, setNowSec] = useState(getNowSec);

  useEffect(() => {
    if (!storageKey) {
      setStored({ totalSeconds: 0, runningSinceSec: null, updatedAtMs: 0 });
      return;
    }
    setStored(readStoredTaskTimerState(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    setStored((previous) => {
      const now = getNowSec();
      if (active) {
        if (previous.runningSinceSec !== null) {
          return previous;
        }
        const next: StoredTaskTimerState = {
          totalSeconds: previous.totalSeconds,
          runningSinceSec: now,
          updatedAtMs: Date.now(),
        };
        writeStoredTaskTimerState(storageKey, next);
        return next;
      }

      if (previous.runningSinceSec === null) {
        return previous;
      }
      const delta = Math.max(0, now - previous.runningSinceSec);
      const next: StoredTaskTimerState = {
        totalSeconds: previous.totalSeconds + delta,
        runningSinceSec: null,
        updatedAtMs: Date.now(),
      };
      writeStoredTaskTimerState(storageKey, next);
      return next;
    });
  }, [active, storageKey]);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    setNowSec(getNowSec());
    const timer = window.setInterval(() => {
      setNowSec(getNowSec());
    }, FLIP_TICK_MS);

    return () => window.clearInterval(timer);
  }, [active]);

  const elapsedSeconds =
    active && stored.runningSinceSec !== null
      ? Math.max(0, nowSec - stored.runningSinceSec)
      : 0;
  const totalSeconds = Math.max(0, stored.totalSeconds) + elapsedSeconds;
  const formatted = useMemo(() => formatHms(totalSeconds), [totalSeconds]);

  const rootClasses = [
    "task-timer",
    active ? "task-timer--active" : "",
    placement === "overlay" ? "task-timer--overlay" : "task-timer--footer",
    theme ? `task-timer--${theme}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const digitHeightPx = placement === "overlay" ? 18 : 14;

  return (
    <output className={rootClasses}>
      <FlipClock
        active={active}
        digitHeightPx={digitHeightPx}
        value={formatted}
      />
    </output>
  );
};
