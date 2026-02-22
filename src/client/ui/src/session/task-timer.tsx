import { useEffect, useMemo, useRef, useState } from "react";
import type { ProviderTheme } from "./helpers";

type TaskTimerPlacement = "overlay" | "footer";
type TaskTimerMode = "total" | "turn";

type TaskTimerProps = {
  readonly storageKey: string | null;
  readonly active: boolean;
  readonly placement: TaskTimerPlacement;
  readonly mode?: TaskTimerMode;
  readonly theme?: ProviderTheme | null;
};

type StoredTaskTimerState = {
  readonly totalSeconds: number;
  readonly runningSinceSec: number | null;
  readonly updatedAtMs: number;
};

const TICK_MS = 1000;

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

const formatHmsShort = (totalSeconds: number): string => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const hoursText = hours < 100 ? pad2(hours) : String(hours);
  return `${hoursText}h ${pad2(minutes)}m ${pad2(seconds)}s`;
};

export const TaskTimer = ({
  storageKey,
  active,
  placement,
  mode = "total",
  theme = null,
}: TaskTimerProps) => {
  const [stored, setStored] = useState<StoredTaskTimerState>(() => {
    if (!storageKey) {
      return { totalSeconds: 0, runningSinceSec: null, updatedAtMs: 0 };
    }
    return readStoredTaskTimerState(storageKey);
  });
  const [nowSec, setNowSec] = useState(getNowSec);
  const turnStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== "total") {
      return;
    }
    if (!storageKey) {
      setStored({ totalSeconds: 0, runningSinceSec: null, updatedAtMs: 0 });
      return;
    }
    setStored(readStoredTaskTimerState(storageKey));
  }, [mode, storageKey]);

  useEffect(() => {
    if (mode !== "total") {
      return;
    }
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
  }, [active, mode, storageKey]);

  useEffect(() => {
    if (!active) {
      if (mode === "turn") {
        turnStartedAtRef.current = null;
      }
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    if (mode === "turn") {
      turnStartedAtRef.current = getNowSec();
    }

    setNowSec(getNowSec());
    const timer = window.setInterval(() => {
      setNowSec(getNowSec());
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [active, mode]);

  const activeTurnSeconds = useMemo(() => {
    if (!active) {
      return 0;
    }
    if (mode === "turn") {
      const startedAt = turnStartedAtRef.current;
      return startedAt === null ? 0 : Math.max(0, nowSec - startedAt);
    }

    if (stored.runningSinceSec === null) {
      return 0;
    }
    return Math.max(0, nowSec - stored.runningSinceSec);
  }, [active, mode, nowSec, stored.runningSinceSec]);

  const totalSeconds =
    mode === "total"
      ? Math.max(0, stored.totalSeconds) + activeTurnSeconds
      : activeTurnSeconds;
  const formatted = useMemo(() => formatHmsShort(totalSeconds), [totalSeconds]);

  const rootClasses = [
    "task-timer",
    active ? "task-timer--active" : "",
    placement === "overlay" ? "task-timer--overlay" : "task-timer--footer",
    theme ? `task-timer--${theme}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <output className={rootClasses}>{formatted}</output>;
};
