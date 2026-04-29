import type { TreeNode } from "./workspace-tree-model";

const TYPE_MARKER_LABELS: Record<string, string> = {
  "product-part": "P",
  cluster: "C",
  module: "M",
};

export const renderTypeMarker = (node: TreeNode) => {
  const letter = TYPE_MARKER_LABELS[node.nodeType ?? ""];
  if (!letter) {
    return <span className="pm-tree__status" />;
  }
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <span
      className={`pm-tree__type-marker${hasChildren ? " pm-tree__type-marker--has-children" : ""}`}
    >
      {letter}
    </span>
  );
};
