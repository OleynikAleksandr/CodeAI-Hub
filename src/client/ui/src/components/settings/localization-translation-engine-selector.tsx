import type {
  CSSProperties,
  FC,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LocalizationEngineAvailability } from "./localization-engine-availability";
import { settingsColorTokens, settingsTypographyTokens } from "./style-tokens";

interface TranslationEngineOption {
  readonly engineId: string;
}

interface TranslationEngineViewOption {
  readonly disabled: boolean;
  readonly engineId: string;
  readonly label: string;
}

const controlRowStyles: CSSProperties = {
  display: "grid",
  gap: "8px",
  padding: "12px",
  borderRadius: "8px",
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  background: "rgba(255, 255, 255, 0.02)",
};

const labelTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: settingsColorTokens.textPrimary,
  margin: 0,
};

const labelDescriptionStyles: CSSProperties = {
  fontSize: settingsTypographyTokens.bodyFontSize,
  color: settingsColorTokens.textMuted,
  lineHeight: 1.5,
  margin: 0,
};

const availabilityHintStyles: CSSProperties = {
  fontSize: settingsTypographyTokens.bodyFontSize,
  color: settingsColorTokens.textMuted,
  lineHeight: 1.5,
  margin: 0,
};

const availabilityWarningStyles: CSSProperties = {
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  borderRadius: "6px",
  background: "rgba(190, 145, 75, 0.12)",
  color: settingsColorTokens.textSecondary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  lineHeight: 1.5,
  margin: 0,
  padding: "10px 12px",
};

const selectorRootStyles: CSSProperties = {
  position: "relative",
};

const triggerButtonStyles: CSSProperties = {
  width: "100%",
  minHeight: "36px",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: "6px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.surface,
  color: settingsColorTokens.textPrimary,
  fontSize: settingsTypographyTokens.bodyFontSize,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  cursor: "pointer",
  textAlign: "left",
};

const triggerLabelStyles: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const triggerChevronStyles: CSSProperties = {
  color: settingsColorTokens.textMuted,
  flexShrink: 0,
  fontSize: "12px",
};

const listboxStyles: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  zIndex: 20,
  maxHeight: "260px",
  overflowY: "auto",
  borderRadius: "8px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.surface,
  boxShadow: "0 12px 24px rgba(0, 0, 0, 0.22)",
  display: "grid",
  gap: "4px",
  padding: "6px",
};

const optionButtonStyles: CSSProperties = {
  width: "100%",
  textAlign: "left",
  border: "none",
  borderRadius: "6px",
  background: "transparent",
  color: settingsColorTokens.textPrimary,
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: settingsTypographyTokens.bodyFontSize,
};

interface TranslationEngineSelectorProps {
  readonly availabilityByEngineId: ReadonlyMap<
    string,
    LocalizationEngineAvailability
  >;
  readonly description: string;
  readonly hint: string;
  readonly label: string;
  readonly onChange: (engineId: string) => void;
  readonly renderEngineLabel: (engineId: string) => string;
  readonly selectedEngineId: string;
  readonly unavailableMessage: string | null;
  readonly unavailableSuffix: string;
  readonly visibleEngineOptions: readonly TranslationEngineOption[];
}

const findSelectableIndex = (
  options: readonly TranslationEngineViewOption[],
  startIndex: number,
  direction: 1 | -1
): number => {
  if (options.length === 0) {
    return -1;
  }

  for (let offset = 0; offset < options.length; offset += 1) {
    const index =
      (startIndex + direction * offset + options.length) % options.length;
    if (!options[index]?.disabled) {
      return index;
    }
  }

  return -1;
};

const resolveNextHighlightedIndex = (
  options: readonly TranslationEngineViewOption[],
  highlightedIndex: number,
  direction: 1 | -1
): number =>
  direction === 1
    ? findSelectableIndex(options, highlightedIndex + 1, 1)
    : findSelectableIndex(options, highlightedIndex - 1, -1);

export const TranslationEngineSelector: FC<TranslationEngineSelectorProps> = ({
  availabilityByEngineId,
  description,
  hint,
  label,
  onChange,
  renderEngineLabel,
  selectedEngineId,
  unavailableMessage,
  unavailableSuffix,
  visibleEngineOptions,
}) => {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const viewOptions = useMemo<readonly TranslationEngineViewOption[]>(
    () =>
      visibleEngineOptions.map((engine) => {
        const availability = availabilityByEngineId.get(engine.engineId);
        const disabled = availability?.disabled === true;
        const labelText = renderEngineLabel(engine.engineId);
        return {
          disabled,
          engineId: engine.engineId,
          label: disabled ? `${labelText} (${unavailableSuffix})` : labelText,
        };
      }),
    [
      availabilityByEngineId,
      renderEngineLabel,
      unavailableSuffix,
      visibleEngineOptions,
    ]
  );
  const selectedIndex = Math.max(
    0,
    viewOptions.findIndex((option) => option.engineId === selectedEngineId)
  );
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);

  useEffect(() => {
    setHighlightedIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const openSelector = () => {
    const nextIndex = viewOptions[selectedIndex]?.disabled
      ? findSelectableIndex(viewOptions, selectedIndex, 1)
      : selectedIndex;
    setHighlightedIndex(nextIndex >= 0 ? nextIndex : selectedIndex);
    setIsOpen(true);
  };

  const commitSelection = (engineId: string) => {
    onChange(engineId);
    setIsOpen(false);
  };

  const handleArrowKey = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    direction: 1 | -1
  ) => {
    event.preventDefault();
    if (!isOpen) {
      openSelector();
      return;
    }
    const nextIndex = resolveNextHighlightedIndex(
      viewOptions,
      highlightedIndex,
      direction
    );
    if (nextIndex >= 0) {
      setHighlightedIndex(nextIndex);
    }
  };

  const handleConfirmKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!isOpen) {
      openSelector();
      return;
    }
    const highlightedOption = viewOptions[highlightedIndex];
    if (highlightedOption && !highlightedOption.disabled) {
      commitSelection(highlightedOption.engineId);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      handleArrowKey(event, 1);
      return;
    }

    if (event.key === "ArrowUp") {
      handleArrowKey(event, -1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      handleConfirmKey(event);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const selectedOption = viewOptions[selectedIndex] ?? viewOptions[0];

  return (
    <div style={controlRowStyles}>
      <p style={labelTitleStyles}>{label}</p>
      <p style={labelDescriptionStyles}>{description}</p>
      <div ref={rootRef} style={selectorRootStyles}>
        <button
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              return;
            }
            openSelector();
          }}
          onKeyDown={handleKeyDown}
          style={triggerButtonStyles}
          type="button"
        >
          <span style={triggerLabelStyles}>
            {selectedOption?.label ?? selectedEngineId}
          </span>
          <span aria-hidden="true" style={triggerChevronStyles}>
            {isOpen ? "▲" : "▼"}
          </span>
        </button>
        {isOpen ? (
          <div id={listboxId} role="listbox" style={listboxStyles}>
            {viewOptions.map((option, index) => {
              const isHighlighted = index === highlightedIndex;
              const optionColor = option.disabled
                ? settingsColorTokens.textMuted
                : settingsColorTokens.textPrimary;
              const optionBackground = isHighlighted
                ? settingsColorTokens.actionPrimary
                : "transparent";
              const optionTextColor = isHighlighted
                ? settingsColorTokens.actionPrimaryText
                : optionColor;
              return (
                <button
                  aria-selected={option.engineId === selectedEngineId}
                  disabled={option.disabled}
                  key={option.engineId}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    if (!option.disabled) {
                      commitSelection(option.engineId);
                    }
                  }}
                  onMouseEnter={() => {
                    if (!option.disabled) {
                      setHighlightedIndex(index);
                    }
                  }}
                  role="option"
                  style={{
                    ...optionButtonStyles,
                    background: optionBackground,
                    color: optionTextColor,
                    cursor: option.disabled
                      ? "not-allowed"
                      : optionButtonStyles.cursor,
                    opacity: option.disabled ? 0.7 : 1,
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <p style={availabilityHintStyles}>{hint}</p>
      {unavailableMessage ? (
        <p style={availabilityWarningStyles}>{unavailableMessage}</p>
      ) : null}
    </div>
  );
};
