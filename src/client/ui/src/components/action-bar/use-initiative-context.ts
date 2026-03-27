import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInitiative as createInitiativeRequest,
  type InitiativeSummary,
  listInitiatives,
} from "../../api/orchestrator/initiatives-client";
import { resolveCoreHttpUrl } from "../../services/idea-collector-support";

interface InitiativeContextState {
  readonly canStartFlow: boolean;
  readonly controlsDisabled: boolean;
  readonly initiatives: readonly InitiativeSummary[];
  readonly initiativeTitle: string;
  readonly selectedInitiativeSlug: string | null;
  readonly statusMessage: string | null;
}

interface CreateInput {
  readonly description?: string;
  readonly displayName: string;
}

interface InitiativeContextActions {
  readonly clearStatus: () => void;
  readonly createInitiative: (input: CreateInput) => Promise<boolean>;
  readonly handleInitiativeChange: (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => void;
}

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
  const [selectedInitiativeSlug, setSelectedInitiativeSlug] = useState<
    string | null
  >(null);
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

  useEffect(() => {
    if (disabled || !hasWorkspace) {
      return;
    }
    refreshInitiatives().catch(() => {
      /* no-op */
    });
  }, [disabled, hasWorkspace, refreshInitiatives]);

  const selectedInitiative = useMemo(
    () =>
      initiatives.find(
        (initiative) => initiative.initiativeSlug === selectedInitiativeSlug
      ) ?? null,
    [initiatives, selectedInitiativeSlug]
  );

  const initiativeTitle = selectedInitiative
    ? [selectedInitiative.displayName, selectedInitiative.description]
        .filter(Boolean)
        .join(" — ")
    : "Select initiative";

  const handleInitiativeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextSlug = event.target.value;
      setSelectedInitiativeSlug(nextSlug.length > 0 ? nextSlug : null);
    },
    []
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

  return {
    initiatives,
    selectedInitiativeSlug,
    initiativeTitle,
    canStartFlow: Boolean(selectedInitiativeSlug),
    controlsDisabled: disabled || !hasWorkspace,
    statusMessage,
    handleInitiativeChange,
    createInitiative,
    clearStatus,
  };
};
