export type ArtifactHeaderMode = "artifacts" | "source" | "help";

type DiagramTool = "Diagram Modules" | "Diagram Facades";

const DIAGRAM_TOOL_SOURCE: Readonly<
  Record<DiagramTool, { readonly label: string; readonly path: string }>
> = {
  "Diagram Modules": {
    label: "module-map.md",
    path: "diagram_modules/module-map.md",
  },
  "Diagram Facades": {
    label: "facade-map.md",
    path: "diagram_facades/facade-map.md",
  },
};

export const isDiagramTool = (tool: string | null): tool is DiagramTool =>
  tool === "Diagram Modules" || tool === "Diagram Facades";

export const resolveArtifactHeaderModes = (
  tool: string | null
): readonly ArtifactHeaderMode[] =>
  !tool
    ? ["artifacts"]
    : isDiagramTool(tool)
      ? ["artifacts", "source", "help"]
      : ["artifacts", "help"];

export const normalizeArtifactHeaderMode = (
  tool: string | null,
  mode: ArtifactHeaderMode
): ArtifactHeaderMode =>
  resolveArtifactHeaderModes(tool).includes(mode) ? mode : "artifacts";

export const resolveDiagramSourceArtifact = (params: {
  readonly activeTool: string | null;
  readonly workspacePath?: string;
  readonly workspaceSlug: string | null;
}):
  | {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly path: string;
      readonly label: string;
    }
  | null => {
  if (!(isDiagramTool(params.activeTool) && params.workspacePath && params.workspaceSlug)) {
    return null;
  }
  const source = DIAGRAM_TOOL_SOURCE[params.activeTool];
  return {
    label: source.label,
    path: `.codeai-hub/${params.workspaceSlug}/${source.path}`,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  };
};
