import React, { useEffect, useId, useRef, useState } from "react";

export interface CaptureWorkbenchListboxOption {
  readonly disabled?: boolean;
  readonly groupLabel?: string;
  readonly label: string;
  readonly title?: string;
  readonly value: string;
}

interface CaptureWorkbenchDomListboxSelectorProps {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly CaptureWorkbenchListboxOption[];
  readonly tone?: "claude" | "codex";
  readonly value: string;
}

export const CaptureWorkbenchDomListboxSelector: React.FC<
  CaptureWorkbenchDomListboxSelectorProps
> = ({ label, onChange, options, tone, value }) => {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption =
    options.find((option) => option.value === value) ??
    options.find((option) => !option.disabled) ??
    options[0];
  const selectedValue = selectedOption?.value ?? value;

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent): void => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [open]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const renderOptions = (): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let currentGroup: string | undefined;

    for (const option of options) {
      if (option.groupLabel && option.groupLabel !== currentGroup) {
        currentGroup = option.groupLabel;
        nodes.push(
          <div
            key={`group-${option.groupLabel}`}
            role="presentation"
            style={styles.groupLabel}
          >
            {option.groupLabel}
          </div>
        );
      }

      nodes.push(
        <button
          aria-selected={option.value === selectedValue}
          disabled={option.disabled}
          key={option.value}
          onClick={() => {
            if (option.disabled) {
              return;
            }
            onChange(option.value);
            setOpen(false);
          }}
          role="option"
          style={{
            ...styles.option,
            ...(option.value === selectedValue ? styles.optionSelected : {}),
            ...(option.disabled ? styles.optionDisabled : {}),
          }}
          title={option.title}
          type="button"
        >
          {option.label}
        </button>
      );
    }

    return nodes;
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      ref={rootRef}
      style={{
        ...styles.selector,
        ...(tone === "claude" ? styles.selectorClaude : {}),
        ...(tone === "codex" ? styles.selectorCodex : {}),
      }}
    >
      <span id={labelId} style={styles.selectorLabel}>
        {label}
      </span>
      <div style={styles.controlRoot}>
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={labelId}
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          style={styles.trigger}
          type="button"
        >
          <span style={styles.triggerText}>{selectedOption?.label ?? value}</span>
          <span aria-hidden="true" style={styles.triggerCaret}>
            v
          </span>
        </button>
        <div
          aria-hidden={!open}
          aria-labelledby={labelId}
          role="listbox"
          style={{
            ...styles.listbox,
            display: open ? "block" : "none",
          }}
        >
          {renderOptions()}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  controlRoot: {
    minWidth: 0,
    position: "relative",
  },
  groupLabel: {
    color: "#7e828a",
    fontSize: 10,
    fontWeight: 700,
    padding: "7px 10px 4px",
    textTransform: "uppercase",
  },
  listbox: {
    background: "#20232a",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    borderRadius: 6,
    boxShadow: "0 12px 26px rgba(0, 0, 0, 0.35)",
    left: 0,
    minWidth: "max(100%, 220px)",
    overflow: "hidden",
    padding: 4,
    position: "absolute",
    top: "calc(100% + 8px)",
    width: "max-content",
    zIndex: 20,
  },
  option: {
    background: "transparent",
    border: 0,
    borderRadius: 4,
    color: "#e6e8eb",
    cursor: "pointer",
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    padding: "7px 10px",
    textAlign: "left",
    whiteSpace: "nowrap",
    width: "100%",
  },
  optionDisabled: {
    color: "#6f747d",
    cursor: "not-allowed",
  },
  optionSelected: {
    background: "rgba(103, 192, 212, 0.16)",
    color: "#f6f8fb",
  },
  selector: {
    alignItems: "center",
    background: "#2c313b",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    display: "inline-flex",
    gap: 8,
    minWidth: 0,
    padding: "7px 10px",
  },
  selectorClaude: {
    background: "rgba(230, 166, 116, 0.18)",
    borderColor: "rgba(230, 166, 116, 0.55)",
  },
  selectorCodex: {
    background: "rgba(103, 192, 212, 0.18)",
    borderColor: "rgba(103, 192, 212, 0.55)",
  },
  selectorLabel: {
    color: "#7e828a",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  trigger: {
    alignItems: "center",
    background: "transparent",
    border: 0,
    color: "#e6e8eb",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 500,
    gap: 6,
    minWidth: 0,
    outline: "none",
    padding: 0,
  },
  triggerCaret: {
    color: "#7e828a",
    fontSize: 10,
    lineHeight: 1,
  },
  triggerText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
