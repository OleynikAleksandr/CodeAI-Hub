import { useEffect, useState } from "react";
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

export const ProjectManagerSessionView = ({
  workspacePath,
  preferredSessionId,
  pendingSessionCreate = null,
}: ProjectManagerSessionViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("runtime");
  const [dialogIntent, setDialogIntent] = useState<DialogOpenIntent | null>(
    null
  );

  useEffect(() => {
    setDialogIntent(null);
    setViewMode("runtime");
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
