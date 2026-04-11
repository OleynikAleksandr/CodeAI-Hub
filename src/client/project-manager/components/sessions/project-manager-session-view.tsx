import { useCallback, useEffect, useRef, useState } from "react";
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

type ViewMode = "runtime" | "dialog";

export const ProjectManagerSessionView = ({
  workspacePath,
  preferredSessionId,
  pendingSessionCreate = null,
  startupStage = "description",
  initialDialogIntent = null,
}: ProjectManagerSessionViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialDialogIntent ? "dialog" : "runtime"
  );
  const [dialogIntent, setDialogIntent] = useState<DialogOpenIntent | null>(
    initialDialogIntent
  );
  const appliedIntentRef = useRef<StageSessionIntent | null>(initialDialogIntent);
  const handleFileLinkActivate = useCallback((target: FileLinkTarget) => {
    openProjectManagerFileLink(target);
  }, []);

  // When initialDialogIntent changes (stage switch, startup), sync immediately
  useEffect(() => {
    if (initialDialogIntent === appliedIntentRef.current) return;
    appliedIntentRef.current = initialDialogIntent;
    if (initialDialogIntent) {
      setDialogIntent(initialDialogIntent);
      setViewMode("dialog");
    } else {
      setViewMode("runtime");
    }
  }, [initialDialogIntent]);

  useEffect(() => {
    setDialogIntent(null);
    setViewMode("runtime");
    appliedIntentRef.current = null;
  }, [workspacePath]);

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
      setDialogIntent(detail);
      setViewMode("dialog");
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
