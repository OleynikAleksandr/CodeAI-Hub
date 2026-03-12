import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import ProjectManagerDialogSessionView, {
  type DialogOpenIntent,
} from "./project-manager-dialog-session-view";
import { shouldDiscardRestoredDialogIntent } from "./project-manager-dialog-session-view-helpers";
import ProjectManagerRuntimeSessionView from "./project-manager-runtime-session-view";

type ProjectManagerSessionViewProps = {
  readonly workspacePath?: string;
  readonly preferredSessionId?: string | null;
  readonly pendingSessionCreate?: { readonly providerTitle: string } | null;
};

type ViewMode = "runtime" | "dialog";

const LAST_DIALOG_INTENT_STORAGE_PREFIX = "codeai.pm.lastDialogIntent.v1:";

const buildLastDialogIntentStorageKey = (workspacePath: string): string =>
  `${LAST_DIALOG_INTENT_STORAGE_PREFIX}${encodeURIComponent(workspacePath)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const loadLastDialogIntent = (workspacePath: string): DialogOpenIntent | null => {
  try {
    const raw = window.localStorage.getItem(
      buildLastDialogIntentStorageKey(workspacePath)
    );
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const providerId = parsed.providerId;
    const workspaceSlug = parsed.workspaceSlug;
    const storedWorkspacePath = parsed.workspacePath;
    if (
      typeof providerId !== "string" ||
      typeof workspaceSlug !== "string" ||
      typeof storedWorkspacePath !== "string" ||
      storedWorkspacePath !== workspacePath
    ) {
      return null;
    }
    const providerSessionId =
      parsed.providerSessionId === null || typeof parsed.providerSessionId === "string"
        ? (parsed.providerSessionId as string | null)
        : null;
    const initiativeSlug =
      parsed.initiativeSlug === null || typeof parsed.initiativeSlug === "string"
        ? (parsed.initiativeSlug as string | null)
        : null;
    const stage =
      parsed.stage === null || typeof parsed.stage === "string"
        ? (parsed.stage as string | null)
        : null;
    const sessionKind =
      parsed.sessionKind === "collector" ||
      parsed.sessionKind === null
        ? (parsed.sessionKind as "collector" | null)
        : null;
    const runSlug =
      parsed.runSlug === null || typeof parsed.runSlug === "string"
        ? (parsed.runSlug as string | null)
        : null;

    return {
      providerId,
      providerSessionId,
      workspacePath,
      workspaceSlug,
      initiativeSlug,
      stage,
      sessionKind: stage === "description" ? null : sessionKind,
      runSlug,
    };
  } catch {
    return null;
  }
};

const saveLastDialogIntent = (intent: DialogOpenIntent): void => {
  try {
    window.localStorage.setItem(
      buildLastDialogIntentStorageKey(intent.workspacePath),
      JSON.stringify(intent)
    );
  } catch {
    // ignore: PM will behave as stateless on persistence failures.
  }
};

export const ProjectManagerSessionView = ({
  workspacePath,
  preferredSessionId,
  pendingSessionCreate = null,
}: ProjectManagerSessionViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("runtime");
  const [dialogIntent, setDialogIntent] = useState<DialogOpenIntent | null>(
    null
  );
  const restoreGenerationRef = useRef(0);

  useEffect(() => {
    restoreGenerationRef.current += 1;
    const restoreGeneration = restoreGenerationRef.current;

    if (!workspacePath) {
      setDialogIntent(null);
      setViewMode("runtime");
      return;
    }

    const restoreDialogIntent = async () => {
      const restored = loadLastDialogIntent(workspacePath);
      if (!restored) {
        if (restoreGenerationRef.current !== restoreGeneration) {
          return;
        }
        setDialogIntent(null);
        setViewMode("runtime");
        return;
      }

      const workflowState = await api.getWorkflowState(
        restored.workspaceSlug,
        workspacePath
      );
      if (restoreGenerationRef.current !== restoreGeneration) {
        return;
      }
      if (
        shouldDiscardRestoredDialogIntent({
          intent: restored,
          workflowState,
        })
      ) {
        setDialogIntent(null);
        setViewMode("runtime");
        return;
      }

      setDialogIntent(restored);
      setViewMode("dialog");
    };

    void restoreDialogIntent();
  }, [workspacePath]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<DialogOpenIntent>;
      const detail = custom.detail;
      if (
        !detail ||
        typeof detail.providerId !== "string" ||
        typeof detail.workspaceSlug !== "string" ||
        typeof detail.workspacePath !== "string"
      ) {
        return;
      }
      restoreGenerationRef.current += 1;
      setDialogIntent(detail);
      setViewMode("dialog");
      saveLastDialogIntent(detail);
    };
    window.addEventListener("pm:dialog:open", handler);
    return () => {
      window.removeEventListener("pm:dialog:open", handler);
    };
  }, []);

  if (viewMode === "dialog") {
    return (
      <ProjectManagerDialogSessionView
        emptyStatePending={Boolean(pendingSessionCreate)}
        intent={dialogIntent}
        onExit={() => setViewMode("runtime")}
      />
    );
  }

  return (
    <ProjectManagerRuntimeSessionView
      emptyStatePending={Boolean(pendingSessionCreate)}
      preferredSessionId={preferredSessionId}
      workspacePath={workspacePath}
    />
  );
};
