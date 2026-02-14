import ProjectManagerRuntimeSessionView from "./project-manager-runtime-session-view";

type ProjectManagerSessionViewProps = {
  readonly workspacePath?: string;
  readonly preferredSessionId?: string | null;
};

export const ProjectManagerSessionView = ({
  workspacePath,
  preferredSessionId,
}: ProjectManagerSessionViewProps) => {
  return (
    <ProjectManagerRuntimeSessionView
      preferredSessionId={preferredSessionId}
      workspacePath={workspacePath}
    />
  );
};
