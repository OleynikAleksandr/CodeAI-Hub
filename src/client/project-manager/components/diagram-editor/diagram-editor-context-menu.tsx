import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import type {
  ClusterModuleColumns,
  ProductPartLayoutColumns,
  TargetAspectRatio,
} from "./diagram-editor-layout-params";

type ContextMenuPosition = { readonly x: number; readonly y: number };

type ProductPartMenuTarget = {
  readonly kind: "productPart";
  readonly productPartId: string;
  readonly currentColumns: ProductPartLayoutColumns;
  readonly currentAspectRatio: TargetAspectRatio;
};

type ClusterMenuTarget = {
  readonly kind: "cluster";
  readonly clusterId: string;
  readonly currentModuleColumns: ClusterModuleColumns;
};

export type ContextMenuTarget = ProductPartMenuTarget | ClusterMenuTarget;

export type DiagramEditorContextMenuProps = {
  readonly position: ContextMenuPosition;
  readonly target: ContextMenuTarget;
  readonly onProductPartColumnsChange: (
    productPartId: string,
    columns: ProductPartLayoutColumns,
  ) => void;
  readonly onProductPartAspectRatioChange: (
    productPartId: string,
    ratio: TargetAspectRatio,
  ) => void;
  readonly onClusterModuleColumnsChange: (
    clusterId: string,
    columns: ClusterModuleColumns,
  ) => void;
  readonly onClose: () => void;
};

const menuStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 1000,
  minWidth: 180,
  borderRadius: 12,
  border: "1px solid var(--pm-border-color)",
  background: "var(--pm-bg-elevated, rgba(15, 22, 36, 0.96))",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  padding: "6px 0",
  fontSize: 12,
};

const sectionLabelStyle: React.CSSProperties = {
  padding: "6px 14px 4px",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--pm-text-muted)",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 14px",
  cursor: "pointer",
  color: "var(--pm-text-primary, #e0e6ed)",
};

const checkWidth = 16;

const MenuItem = ({
  active,
  label,
  onClick,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) => (
  <div
    role="menuitem"
    style={itemStyle}
    onClick={onClick}
    onKeyDown={(e) => e.key === "Enter" && onClick()}
    tabIndex={0}
  >
    <span style={{ width: checkWidth, textAlign: "center" }}>
      {active ? "●" : ""}
    </span>
    {label}
  </div>
);

const COLUMN_OPTIONS: readonly { value: ProductPartLayoutColumns; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: 2, label: "2 columns" },
  { value: 3, label: "3 columns" },
  { value: 4, label: "4 columns" },
  { value: 5, label: "5 columns" },
];

const RATIO_OPTIONS: readonly { value: TargetAspectRatio; label: string }[] = [
  { value: "landscape", label: "Landscape (4:3)" },
  { value: "wide", label: "Wide (16:9)" },
  { value: "square", label: "Square (1:1)" },
];

const MODULE_COLUMN_OPTIONS: readonly { value: ClusterModuleColumns; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: 1, label: "1 column" },
  { value: 2, label: "2 columns" },
  { value: 3, label: "3 columns" },
];

export const DiagramEditorContextMenu: React.FC<DiagramEditorContextMenuProps> = ({
  position,
  target,
  onProductPartColumnsChange,
  onProductPartAspectRatioChange,
  onClusterModuleColumnsChange,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [handleClickOutside, onClose]);

  if (target.kind === "productPart") {
    return (
      <div ref={ref} role="menu" style={{ ...menuStyle, left: position.x, top: position.y }}>
        <div style={sectionLabelStyle}>Layout Columns</div>
        {COLUMN_OPTIONS.map((opt) => (
          <MenuItem
            active={target.currentColumns === opt.value}
            key={String(opt.value)}
            label={opt.label}
            onClick={() => {
              onProductPartColumnsChange(target.productPartId, opt.value);
              onClose();
            }}
          />
        ))}
        <div style={{ ...sectionLabelStyle, marginTop: 4 }}>Aspect Ratio</div>
        {RATIO_OPTIONS.map((opt) => (
          <MenuItem
            active={target.currentAspectRatio === opt.value}
            key={opt.value}
            label={opt.label}
            onClick={() => {
              onProductPartAspectRatioChange(target.productPartId, opt.value);
              onClose();
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} role="menu" style={{ ...menuStyle, left: position.x, top: position.y }}>
      <div style={sectionLabelStyle}>Module Columns</div>
      {MODULE_COLUMN_OPTIONS.map((opt) => (
        <MenuItem
          active={target.currentModuleColumns === opt.value}
          key={String(opt.value)}
          label={opt.label}
          onClick={() => {
            onClusterModuleColumnsChange(target.clusterId, opt.value);
            onClose();
          }}
        />
      ))}
    </div>
  );
};
