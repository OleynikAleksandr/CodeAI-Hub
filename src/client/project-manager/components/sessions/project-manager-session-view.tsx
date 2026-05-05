import { useCallback, useEffect, useState } from "react";
import type { FileLinkTarget } from "../../../ui/src/session/file-link-target";
import { openProjectManagerFileLink } from "../../services/project-manager-file-link-opener";
import type { StageSessionIntent } from "../shared/stage-confirmation-card";
import ProjectManagerDialogSessionView, {
  type DialogOpenIntent,
} from "./project-manager-dialog-session-view";
import ProjectManagerRuntimeSessionView from "./project-manager-runtime-session-view";

type ProjectManagerSessionViewProps = {
  readonly workspacePath?: string;
  readonly preferredSessionId?: string | null;
  readonly pendingSessionCreate?: { readonly providerTitle: string } | null;
  readonly startupStage?: string;
  readonly initialDialogIntent?: StageSessionIntent | null;
};

const isDialogIntentScopedToStartupStage = (
  intent: DialogOpenIntent | StageSessionIntent | null,
  startupStage: string
): intent is DialogOpenIntent | StageSessionIntent => {
  if (!intent) return false;
  if (typeof intent.stage !== "string") {
    return !startupStage.startsWith("development_tree/");
  }
  return intent.stage === startupStage;
};

export const ProjectManagerSessionView = ({
  workspacePath,
  preferredSessionId,
  pendingSessionCreate = null,
  startupStage = "description",
  initialDialogIntent = null,
}: ProjectManagerSessionViewProps) => {
  // Runtime override — set ONLY by pm:dialog:open events (confirmation card Start, manual clicks).
  // Cleared on workspace or stage change.
  const [dialogIntentOverride, setDialogIntentOverride] =
    useState<DialogOpenIntent | null>(null);

  const handleFileLinkActivate = useCallback((target: FileLinkTarget) => {
    openProjectManagerFileLink(target);
  }, []);

  // Clear override on workspace or selected startup stage change.
  useEffect(() => {
    setDialogIntentOverride(null);
  }, [startupStage, workspacePath]);

  // Runtime events (new session creation via confirmation card, manual navigation)
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
      setDialogIntentOverride(detail);
    };
    window.addEventListener("pm:dialog:open", handler);
    return () => {
      window.removeEventListener("pm:dialog:open", handler);
    };
  }, []);

  // Derived — no intermediate renders, no flashing
  const scopedDialogIntentOverride = isDialogIntentScopedToStartupStage(
    dialogIntentOverride,
    startupStage
  )
    ? dialogIntentOverride
    : null;
  const effectiveIntent = scopedDialogIntentOverride ?? initialDialogIntent;

  if (effectiveIntent) {
    return (
      <ProjectManagerDialogSessionView
        emptyStatePending={Boolean(pendingSessionCreate)}
        intent={effectiveIntent}
        onExit={() => setDialogIntentOverride(null)}
        onFileLinkActivate={handleFileLinkActivate}
      />
    );
  }

  return (
    <ProjectManagerRuntimeSessionView
      emptyStatePending={Boolean(pendingSessionCreate)}
      onFileLinkActivate={handleFileLinkActivate}
      preferredSessionId={preferredSessionId}
      startupStage={startupStage}
      workspacePath={workspacePath}
    />
  );
};
