import type { CSSProperties } from "react";
import { memo, useEffect, useId, useState } from "react";
import {
  filterLocalizationLanguageOptions,
  type LocalizationLanguageOption,
} from "./localization-language-filter";
import { settingsColorTokens, settingsTypographyTokens } from "./style-tokens";

interface LocalizationLanguageComboboxProps {
  readonly disabled?: boolean;
  readonly emptyMessage?: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly LocalizationLanguageOption[];
  readonly placeholder?: string;
  readonly value: string;
}

const rootStyles: CSSProperties = {
  position: "relative",
};

const inputStyles: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "36px",
  padding: "8px 10px",
  borderRadius: "6px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.surface,
  color: settingsColorTokens.textPrimary,
  fontSize: settingsTypographyTokens.bodyFontSize,
};

const dropdownStyles: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  zIndex: 10,
  maxHeight: "220px",
  overflowY: "auto",
  borderRadius: "8px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.surface,
  boxShadow: "0 12px 24px rgba(0, 0, 0, 0.22)",
  display: "grid",
  gap: "4px",
  padding: "6px",
};

const optionStyles: CSSProperties = {
  textAlign: "left",
  border: "none",
  borderRadius: "6px",
  background: "transparent",
  color: settingsColorTokens.textPrimary,
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: settingsTypographyTokens.bodyFontSize,
};

const emptyStyles: CSSProperties = {
  color: settingsColorTokens.textMuted,
  fontSize: settingsTypographyTokens.bodyFontSize,
  padding: "8px 10px",
};

const resolveSelectedOption = (
  options: readonly LocalizationLanguageOption[],
  value: string
): LocalizationLanguageOption | null =>
  options.find((option) => option.code === value) ?? null;

export const LocalizationLanguageCombobox = memo(
  ({
    disabled = false,
    emptyMessage = "No languages found.",
    onChange,
    options,
    placeholder,
    value,
  }: LocalizationLanguageComboboxProps) => {
    const listboxId = useId();
    const selectedOption = resolveSelectedOption(options, value);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [query, setQuery] = useState(selectedOption?.label ?? value);
    const filteredOptions = filterLocalizationLanguageOptions(options, query);

    useEffect(() => {
      if (!isOpen) {
        setQuery(selectedOption?.label ?? value);
      }
    }, [isOpen, selectedOption, value]);

    const commitSelection = (nextValue: string) => {
      onChange(nextValue);
      setIsOpen(false);
    };

    return (
      <div style={rootStyles}>
        <input
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          disabled={disabled}
          onBlur={() => {
            window.setTimeout(() => {
              setIsOpen(false);
            }, 0);
          }}
          onChange={(event) => {
            setIsOpen(true);
            setHighlightedIndex(0);
            setQuery(event.target.value);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setHighlightedIndex((current) =>
                Math.min(current + 1, Math.max(filteredOptions.length - 1, 0))
              );
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setHighlightedIndex((current) => Math.max(current - 1, 0));
              return;
            }

            if (event.key === "Enter") {
              if (!isOpen) {
                return;
              }
              event.preventDefault();
              const highlightedOption = filteredOptions[highlightedIndex];
              if (highlightedOption) {
                commitSelection(highlightedOption.code);
              }
              return;
            }

            if (event.key === "Escape") {
              setIsOpen(false);
              setQuery(selectedOption?.label ?? value);
            }
          }}
          placeholder={placeholder}
          role="combobox"
          style={inputStyles}
          value={isOpen ? query : (selectedOption?.label ?? value)}
        />
        {isOpen ? (
          <div id={listboxId} role="listbox" style={dropdownStyles}>
            {filteredOptions.length === 0 ? (
              <div style={emptyStyles}>{emptyMessage}</div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.code}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commitSelection(option.code);
                  }}
                  role="option"
                  style={{
                    ...optionStyles,
                    background:
                      index === highlightedIndex
                        ? settingsColorTokens.actionPrimary
                        : optionStyles.background,
                    color:
                      index === highlightedIndex
                        ? settingsColorTokens.actionPrimaryText
                        : settingsColorTokens.textPrimary,
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    );
  }
);

LocalizationLanguageCombobox.displayName = "LocalizationLanguageCombobox";
