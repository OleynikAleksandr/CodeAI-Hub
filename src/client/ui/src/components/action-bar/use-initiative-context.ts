import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInitiative as createInitiativeRequest,
  type InitiativeSummary,
  listInitiatives,
} from "../../api/orchestrator/initiatives-client";
import {
  createRun as createRunRequest,
  listRuns,
  type RunSummary,
  selectCurrentRun,
} from "../../api/orchestrator/runs-client";
import { resolveCoreHttpUrl } from "../../services/idea-collector-support";

type InitiativeContextState = {
  readonly initiatives: readonly InitiativeSummary[];
  readonly runs: readonly RunSummary[];
  readonly selectedInitiativeSlug: string | null;
  readonly selectedRunId: string | null;
  readonly initiativeTitle: string;
  readonly runTitle: string;
  readonly canStartFlow: boolean;
  readonly controlsDisabled: boolean;
  readonly statusMessage: string | null;
};

type CreateInput = {
  readonly displayName: string;
  readonly description?: string;
};

type InitiativeContextActions = {
  readonly handleInitiativeChange: (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => void;
  readonly handleRunChange: (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => Promise<void>;
  readonly createInitiative: (input: CreateInput) => Promise<boolean>;
  readonly createRun: (input: CreateInput) => Promise<boolean>;
  readonly clearStatus: () => void;
};

export type InitiativeContext = InitiativeContextState &
  InitiativeContextActions;

const resolveWorkspacePath = (): string | null => {
  const globalScope = window as typeof window & {
    __CODEAI_CORE_CONFIG?: { readonly workspacePath?: string };
  };
  const workspacePath = globalScope.__CODEAI_CORE_CONFIG?.workspacePath;
  if (typeof workspacePath !== "string" || workspacePath.length === 0) {
    return null;
  }
  return workspacePath;
};

export const useInitiativeContext = (disabled: boolean): InitiativeContext => {
  const [initiatives, setInitiatives] = useState<InitiativeSummary[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedInitiativeSlug, setSelectedInitiativeSlug] = useState<
    string | null
  >(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const coreHttpUrl = useMemo(() => resolveCoreHttpUrl(), []);
  const workspacePath = useMemo(() => resolveWorkspacePath(), []);
  const hasWorkspace = Boolean(coreHttpUrl && workspacePath);

  const clearStatus = useCallback(() => {
    setStatusMessage(null);
  }, []);

  const refreshInitiatives = useCallback(
    async (preferredSlug?: string | null) => {
      if (!(coreHttpUrl && workspacePath)) {
        return;
      }

      const result = await listInitiatives(coreHttpUrl, workspacePath);
      if (!result.ok) {
        setInitiatives([]);
        return;
      }

      setInitiatives([...result.data]);
      const candidate = preferredSlug ?? selectedInitiativeSlug;
      const fallback =
        candidate &&
        result.data.some(
          (initiative) => initiative.initiativeSlug === candidate
        )
          ? candidate
          : (result.data[0]?.initiativeSlug ?? null);
      setSelectedInitiativeSlug(fallback);
    },
    [coreHttpUrl, selectedInitiativeSlug, workspacePath]
  );

  const refreshRuns = useCallback(
    async (initiativeSlug: string, preferredRunId?: string | null) => {
      if (!(coreHttpUrl && workspacePath)) {
        return;
      }

      const result = await listRuns(coreHttpUrl, workspacePath, initiativeSlug);
      if (!result.ok) {
        setRuns([]);
        setSelectedRunId(null);
        return;
      }

      setRuns([...result.data.runs]);
      const candidate =
        result.data.currentRunId ?? preferredRunId ?? selectedRunId;
      const nextRunId =
        candidate && result.data.runs.some((run) => run.runId === candidate)
          ? candidate
          : (result.data.runs[0]?.runId ?? null);
      setSelectedRunId(nextRunId);
    },
    [coreHttpUrl, selectedRunId, workspacePath]
  );

  useEffect(() => {
    if (disabled || !hasWorkspace) {
      return;
    }
    refreshInitiatives().catch(() => {
      /* no-op */
    });
  }, [disabled, hasWorkspace, refreshInitiatives]);

  useEffect(() => {
    if (!selectedInitiativeSlug) {
      setRuns([]);
      setSelectedRunId(null);
      return;
    }
    if (disabled || !hasWorkspace) {
      return;
    }
    refreshRuns(selectedInitiativeSlug).catch(() => {
      /* no-op */
    });
  }, [disabled, hasWorkspace, refreshRuns, selectedInitiativeSlug]);

  const selectedInitiative = useMemo(
    () =>
      initiatives.find(
        (initiative) => initiative.initiativeSlug === selectedInitiativeSlug
      ) ?? null,
    [initiatives, selectedInitiativeSlug]
  );

  const selectedRun = useMemo(
    () => runs.find((run) => run.runId === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  const initiativeTitle = selectedInitiative
    ? [selectedInitiative.displayName, selectedInitiative.description]
        .filter(Boolean)
        .join(" — ")
    : "Select initiative";

  const runTitle = selectedRun
    ? [selectedRun.displayName, selectedRun.description]
        .filter(Boolean)
        .join(" — ")
    : "Select run";

  const handleInitiativeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextSlug = event.target.value;
      setSelectedInitiativeSlug(nextSlug.length > 0 ? nextSlug : null);
    },
    []
  );

  const handleRunChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!(selectedInitiativeSlug && coreHttpUrl && workspacePath)) {
        return;
      }

      const nextRunId = event.target.value;
      const previousRunId = selectedRunId;
      setSelectedRunId(nextRunId);

      const result = await selectCurrentRun(
        coreHttpUrl,
        workspacePath,
        selectedInitiativeSlug,
        nextRunId
      );

      if (!result.ok) {
        setSelectedRunId(previousRunId ?? null);
        setStatusMessage(result.error);
      }
    },
    [coreHttpUrl, selectedInitiativeSlug, selectedRunId, workspacePath]
  );

  const createInitiative = useCallback(
    async (input: CreateInput) => {
      if (!(coreHttpUrl && workspacePath)) {
        setStatusMessage("Workspace path is unavailable.");
        return false;
      }

      const displayName = input.displayName.trim();
      if (!displayName) {
        setStatusMessage("Provide an initiative name.");
        return false;
      }

      const result = await createInitiativeRequest(coreHttpUrl, workspacePath, {
        displayName,
        description: input.description?.trim() || undefined,
      });
      if (!result.ok) {
        setStatusMessage(result.error);
        return false;
      }

      await refreshInitiatives(result.data.initiativeSlug);
      setStatusMessage(null);
      return true;
    },
    [coreHttpUrl, refreshInitiatives, workspacePath]
  );

  const createRun = useCallback(
    async (input: CreateInput) => {
      if (!selectedInitiativeSlug) {
        setStatusMessage("Select an initiative before creating a run.");
        return false;
      }

      if (!(coreHttpUrl && workspacePath)) {
        setStatusMessage("Workspace path is unavailable.");
        return false;
      }

      const displayName = input.displayName.trim();
      if (!displayName) {
        setStatusMessage("Provide a run name.");
        return false;
      }

      const result = await createRunRequest(
        coreHttpUrl,
        workspacePath,
        selectedInitiativeSlug,
        {
          displayName,
          description: input.description?.trim() || undefined,
        }
      );
      if (!result.ok) {
        setStatusMessage(result.error);
        return false;
      }

      await refreshRuns(selectedInitiativeSlug, result.data.run.runId);
      setStatusMessage(null);
      return true;
    },
    [coreHttpUrl, refreshRuns, selectedInitiativeSlug, workspacePath]
  );

  return {
    initiatives,
    runs,
    selectedInitiativeSlug,
    selectedRunId,
    initiativeTitle,
    runTitle,
    canStartFlow: Boolean(selectedInitiativeSlug && selectedRunId),
    controlsDisabled: disabled || !hasWorkspace,
    statusMessage,
    handleInitiativeChange,
    handleRunChange,
    createInitiative,
    createRun,
    clearStatus,
  };
};
