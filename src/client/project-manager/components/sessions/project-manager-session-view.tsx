import { useEffect, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { api } from "../../api";
import { IdeaCollectorSubmitService } from "../../services/idea-collector-submit-service";
import ProjectManagerDialogSessionView, {
  type DialogOpenIntent,
} from "./project-manager-dialog-session-view";
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
      parsed.sessionKind === "reviewer" ||
      parsed.sessionKind === null
        ? (parsed.sessionKind as "collector" | "reviewer" | null)
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
      sessionKind,
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

type DescriptionRestartAttemptEventDetail = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: string | null;
};

const isProviderStackId = (value: unknown): value is ProviderStackId =>
  value === "claudeCodeCli" || value === "codexCli" || value === "geminiCli";

export const ProjectManagerSessionView = ({
  workspacePath,
  preferredSessionId,
  pendingSessionCreate = null,
}: ProjectManagerSessionViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("runtime");
  const [dialogIntent, setDialogIntent] = useState<DialogOpenIntent | null>(
    null
  );
  const submitServiceRef = useRef(new IdeaCollectorSubmitService());
  const restartAttemptInFlightRef = useRef(false);

  useEffect(() => {
    if (!workspacePath) {
      setDialogIntent(null);
      setViewMode("runtime");
      return;
    }
    const restored = loadLastDialogIntent(workspacePath);
    if (restored) {
      setDialogIntent(restored);
      setViewMode("dialog");
      return;
    }
    setDialogIntent(null);
    setViewMode("runtime");
  }, [workspacePath]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom =
        event as CustomEvent<DescriptionRestartAttemptEventDetail | null>;
      const detail = custom.detail;
      if (!detail) {
        return;
      }
      if (
        typeof detail.workspacePath !== "string" ||
        typeof detail.workspaceSlug !== "string"
      ) {
        return;
      }
      if (workspacePath && detail.workspacePath !== workspacePath) {
        return;
      }

      if (restartAttemptInFlightRef.current) {
        return;
      }
      const confirmed = window.confirm(
        "Перезапустить попытку Description?\n\nТекущая попытка будет отменена, и будет создана новая сессия."
      );
      if (!confirmed) {
        return;
      }
      restartAttemptInFlightRef.current = true;

      void (async () => {
        try {
          const state = await api.getWorkflowState(
            detail.workspaceSlug,
            detail.workspacePath
          );
          const questionnairePathCandidate = state?.description?.questionnairePath;
          const questionnairePath =
            typeof questionnairePathCandidate === "string" &&
            questionnairePathCandidate.trim().length > 0
              ? questionnairePathCandidate.trim()
              : `.codeai-hub/${detail.workspaceSlug}/description/questionnaire.md`;

          const providerIdCandidate =
            isProviderStackId(detail.providerId)
              ? detail.providerId
              : state?.description?.collectorSession?.providerId ??
                state?.description?.session?.providerId ??
                api.getIdeaCollectorProviders().at(0)?.id ??
                null;

          const providerId = isProviderStackId(providerIdCandidate)
            ? providerIdCandidate
            : null;

          if (providerId === null) {
            return;
          }

          await submitServiceRef.current.submitQuestionnaire({
            workspacePath: detail.workspacePath,
            workspaceSlug: detail.workspaceSlug,
            questionnairePath,
            stage: "description",
            providerId,
          });
        } catch {
          // ignore: restart attempt is best-effort
        } finally {
          restartAttemptInFlightRef.current = false;
        }
      })();
    };

    window.addEventListener("pm:description:restart-attempt", handler);
    return () => {
      window.removeEventListener("pm:description:restart-attempt", handler);
    };
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
