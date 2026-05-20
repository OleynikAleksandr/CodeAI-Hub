import type { TreeNode } from "./workspace-tree-model";

const TYPE_MARKER_LABELS: Record<string, string> = {
  "product-part": "P",
  cluster: "C",
  module: "M",
};

const OPERATION_MARKER_LABELS: Record<string, string> = {
  implementation: "I",
  integration: "N",
  module_facade_specification: "F",
  workers: "W",
};

export const renderTypeMarker = (node: TreeNode) => {
  const letter =
    node.nodeType === "operation"
      ? OPERATION_MARKER_LABELS[node.operationKind ?? ""]
      : TYPE_MARKER_LABELS[node.nodeType ?? ""];
  if (!letter) {
    return <span className="pm-tree__status" />;
  }
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <span
      className={[
        "pm-tree__type-marker",
        node.nodeType ? `pm-tree__type-marker--${node.nodeType}` : null,
        node.operationKind
          ? `pm-tree__type-marker--${node.operationKind}`
          : null,
        hasChildren ? "pm-tree__type-marker--has-children" : null,
      ]
        .filter((className): className is string => Boolean(className))
        .join(" ")}
    >
      {letter}
    </span>
  );
};
