import { useEffect, useMemo, useState } from "react";
import type { ProviderTheme } from "./helpers";

type TaskTimerPlacement = "overlay" | "footer";
type TaskTimerMode = "total" | "turn";

export interface TaskTimerSnapshot {
  /**
   * Epoch time in ms when the current busy segment started, or null if idle.
   */
  readonly runningSinceMs: number | null;
  /**
   * Accumulated busy/wait time in whole seconds.
   * Does not include the currently-running busy segment (if any).
   */
  readonly totalSeconds: number;
}

interface TaskTimerProps {
  readonly active: boolean;
  readonly mode?: TaskTimerMode;
  readonly placement: TaskTimerPlacement;
  readonly theme?: ProviderTheme | null;
  readonly timer: TaskTimerSnapshot | null;
}

const TICK_MS = 1000;

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
  timer,
  active,
  placement,
  mode = "total",
  theme = null,
}: TaskTimerProps) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const runningSinceMs = timer?.runningSinceMs ?? null;

  useEffect(() => {
    if (mode !== "turn" || !active || runningSinceMs === null) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [active, mode, runningSinceMs]);

  const displaySeconds = useMemo(() => {
    if (mode === "total") {
      return Math.max(0, Math.floor(timer?.totalSeconds ?? 0));
    }
    if (!active || runningSinceMs === null) {
      return 0;
    }
    return Math.max(0, Math.floor((nowMs - runningSinceMs) / 1000));
  }, [active, mode, nowMs, runningSinceMs, timer?.totalSeconds]);
  const formatted = useMemo(
    () => formatHmsShort(displaySeconds),
    [displaySeconds]
  );

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
