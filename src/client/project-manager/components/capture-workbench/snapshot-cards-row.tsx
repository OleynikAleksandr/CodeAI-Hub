import React, { useEffect, useMemo, useState } from "react";
import {
  createCaptureWorkbenchRunner,
  type CaptureWorkbenchRunnerContext,
  type CaptureWorkbenchRunnerTransport,
} from "../../services/capture-workbench-runner";
import type {
  WorkbenchIndexFile,
  WorkbenchSelectionState,
} from "../../services/workbench-bridge-types";
import {
  createWorkbenchIndexStore,
  resolveWorkbenchSlot,
} from "../../services/workbench-index-store";
import type { WorkbenchStateClientApi } from "../../services/workbench-state-client";
import { CaptureWorkbenchSnapshotCard } from "./snapshot-card";

interface CaptureWorkbenchSnapshotCardsRowProps {
  readonly captureTransport: CaptureWorkbenchRunnerTransport;
  readonly context: CaptureWorkbenchRunnerContext;
  readonly onIndexChange?: (index: WorkbenchIndexFile) => void;
  readonly selection: WorkbenchSelectionState;
  readonly stateClient: WorkbenchStateClientApi;
}

const EMPTY_INDEX: WorkbenchIndexFile = { version: 1, slots: [] };

export const CaptureWorkbenchSnapshotCardsRow: React.FC<
  CaptureWorkbenchSnapshotCardsRowProps
> = ({ captureTransport, context, onIndexChange, selection, stateClient }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<WorkbenchIndexFile>(EMPTY_INDEX);
  const indexStore = useMemo(
    () => createWorkbenchIndexStore(stateClient),
    [stateClient]
  );
  const runner = useMemo(
    () =>
      createCaptureWorkbenchRunner({
        artifactReader: stateClient,
        transport: captureTransport,
      }),
    [captureTransport, stateClient]
  );

  useEffect(() => {
    let cancelled = false;
    indexStore
      .loadIndex()
      .then((nextIndex) => {
        if (!cancelled) {
          setIndex(nextIndex);
          onIndexChange?.(nextIndex);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(normalizeError(loadError));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [indexStore, onIndexChange]);

  const slot = resolveWorkbenchSlot(index, selection);
  const hasArtifacts = index.slots.length > 0;

  const clearCaptures = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await stateClient.saveIndex(EMPTY_INDEX);
      setIndex(EMPTY_INDEX);
      onIndexChange?.(EMPTY_INDEX);
    } catch (clearError) {
      setError(normalizeError(clearError));
    } finally {
      setBusy(false);
    }
  };

  const recaptureManaged = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await runner.runManagedCapture({ context, selection });
      const nextIndex = await indexStore.rotateCapture({
        captureResult: result.captureResult,
        mode: "managed",
        records: result.records,
        slot: result.slot,
      });
      setIndex(nextIndex);
      onIndexChange?.(nextIndex);
    } catch (captureError) {
      setError(normalizeError(captureError));
    } finally {
      setBusy(false);
    }
  };

  const recaptureVanilla = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await runner.runVanillaCapture({ context, selection });
      const nextIndex = await indexStore.rotateCapture({
        captureResult: result.captureResult,
        mode: "vanilla",
        records: result.records,
        slot: result.slot,
      });
      setIndex(nextIndex);
      onIndexChange?.(nextIndex);
    } catch (captureError) {
      setError(normalizeError(captureError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Capture snapshots" style={styles.container}>
      <div style={styles.row}>
        <CaptureWorkbenchSnapshotCard
          busy={busy}
          current={slot?.vanilla.current ?? null}
          mode="vanilla"
          onRecapture={() => {
            void recaptureVanilla();
          }}
          previous={slot?.vanilla.previous ?? null}
        />
        <CaptureWorkbenchSnapshotCard
          busy={busy}
          current={slot?.managed.current ?? null}
          mode="managed"
          onRecapture={() => {
            void recaptureManaged();
          }}
          previous={slot?.managed.previous ?? null}
        />
      </div>
      <div style={styles.actions}>
        <button
          disabled={busy || !hasArtifacts}
          onClick={() => {
            void clearCaptures();
          }}
          style={{
            ...styles.clearButton,
            opacity: busy || !hasArtifacts ? 0.55 : 1,
          }}
          type="button"
        >
          Delete captures
        </button>
      </div>
      {error ? (
        <div role="status" style={styles.error}>
          {error}
        </div>
      ) : null}
    </section>
  );
};

const normalizeError = (error: unknown): string =>
  error instanceof Error ? error.message : "Capture Workbench action failed.";

const styles: Record<string, React.CSSProperties> = {
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  clearButton: {
    background: "transparent",
    border: "1px solid rgba(255, 138, 138, 0.45)",
    borderRadius: 6,
    color: "#ff8a8a",
    cursor: "pointer",
    fontSize: 11,
    padding: "5px 10px",
  },
  container: {
    background: "#20232a",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "grid",
    gap: 8,
    padding: "14px 16px",
  },
  error: {
    color: "#ff8a8a",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 11,
  },
  row: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
};
