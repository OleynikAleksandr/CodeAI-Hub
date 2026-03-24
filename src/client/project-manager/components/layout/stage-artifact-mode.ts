export type ArtifactHeaderMode = "artifacts" | "source" | "help";

type DiagramTool = "Diagram Modules";

const DIAGRAM_TOOL_SOURCE: Readonly<
  Record<DiagramTool, { readonly label: string; readonly path: string }>
> = {
  "Diagram Modules": {
    label: "product-parts.index.md",
    path: "diagram_modules/product-parts.index.md",
  },
};

export const isDiagramTool = (tool: string | null): tool is DiagramTool =>
  tool === "Diagram Modules";

export const resolveArtifactHeaderModes = (
  tool: string | null
): readonly ArtifactHeaderMode[] =>
  !tool
    ? ["artifacts"]
    : isDiagramTool(tool)
      ? ["artifacts", "help"]
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

export const resolveDiagramSourcePendingMessage = (
  tool: string | null
): string => {
  if (tool === "Diagram Modules") {
    return "Source для Diagram Modules станет доступен после создания `product-parts.index.md`. Затем runtime materializes `product-parts/<part-id>.md` для каждого product part.";
  }
  return "Source станет доступен после появления канонического Markdown-артефакта этого шага.";
};
