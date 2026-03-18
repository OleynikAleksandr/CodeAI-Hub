import type { CSSProperties, ReactNode } from "react";

export type ProviderOptionDialogOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  readonly description: string;
  readonly useCase: string;
  readonly isDefault?: boolean;
};

type ProviderOptionDialogProps<Value extends string> = {
  readonly ariaLabel: string;
  readonly closeLabel?: string;
  readonly footer?: ReactNode;
  readonly name: string;
  readonly onCancel: () => void;
  readonly onChange: (value: Value) => void;
  readonly options: readonly ProviderOptionDialogOption<Value>[];
  readonly selectedValue: Value;
  readonly subtitle: string;
  readonly title: string;
};

const overlayStyles: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyles: CSSProperties = {
  width: "560px",
  maxWidth: "90vw",
  maxHeight: "85vh",
  overflowY: "auto",
  background: "#1e1e1e",
  borderRadius: "8px",
  border: "1px solid #3c3c3c",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const headerStyles: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const titleStyles: CSSProperties = {
  fontSize: "16px",
  margin: 0,
  color: "#ffffff",
};

const subtitleStyles: CSSProperties = {
  fontSize: "12px",
  color: "#a0a0a0",
  margin: 0,
};

const closeButtonStyles: CSSProperties = {
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#d7d7d7",
  borderRadius: "4px",
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "12px",
};

const optionListStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const optionRowStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  border: "1px solid #2f2f2f",
  borderRadius: "6px",
  padding: "12px",
  background: "#252526",
  cursor: "pointer",
};

const optionSelectedStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#1f2a33",
};

const radioStyles: CSSProperties = {
  marginTop: "2px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const optionTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#e5e5e5",
  marginBottom: "4px",
  textTransform: "uppercase",
};

const defaultBadgeStyles: CSSProperties = {
  fontSize: "10px",
  color: "#0e639c",
  background: "rgba(14, 99, 156, 0.2)",
  borderRadius: "4px",
  padding: "2px 6px",
  marginLeft: "8px",
  textTransform: "none",
};

const optionDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#b6b6b6",
  margin: 0,
  lineHeight: 1.4,
};

const optionUseCaseStyles: CSSProperties = {
  fontSize: "12px",
  color: "#8f8f8f",
  margin: "6px 0 0",
};

const footerStyles: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};

const cancelButtonStyles: CSSProperties = {
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#d7d7d7",
  padding: "8px 14px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px",
};

const saveButtonStyles: CSSProperties = {
  border: "1px solid #0e639c",
  background: "#0e639c",
  color: "#ffffff",
  padding: "8px 14px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px",
};

export const ProviderOptionDialog = <Value extends string>({
  ariaLabel,
  closeLabel = "Close",
  footer,
  name,
  onCancel,
  onChange,
  options,
  selectedValue,
  subtitle,
  title,
}: ProviderOptionDialogProps<Value>) => (
  <div style={overlayStyles}>
    <div
      aria-label={ariaLabel}
      aria-modal="true"
      role="dialog"
      style={dialogStyles}
    >
      <div style={headerStyles}>
        <div>
          <h3 style={titleStyles}>{title}</h3>
          <p style={subtitleStyles}>{subtitle}</p>
        </div>
        <button onClick={onCancel} style={closeButtonStyles} type="button">
          {closeLabel}
        </button>
      </div>
      <div style={optionListStyles}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;
          return (
            <label
              key={option.value}
              style={{
                ...optionRowStyles,
                ...(isSelected ? optionSelectedStyles : null),
              }}
            >
              <input
                checked={isSelected}
                name={name}
                onChange={() => onChange(option.value)}
                style={radioStyles}
                type="radio"
              />
              <div>
                <div style={optionTitleStyles}>
                  {option.label}
                  {option.isDefault ? (
                    <span style={defaultBadgeStyles}>Default</span>
                  ) : null}
                </div>
                <p style={optionDescriptionStyles}>{option.description}</p>
                <p style={optionUseCaseStyles}>Use case: {option.useCase}</p>
              </div>
            </label>
          );
        })}
      </div>
      <div style={footerStyles}>
        {footer ?? (
          <>
            <button onClick={onCancel} style={cancelButtonStyles} type="button">
              Cancel
            </button>
            <button style={saveButtonStyles} type="button">
              Save
            </button>
          </>
        )}
      </div>
    </div>
  </div>
);

export const providerOptionDialogButtonStyles = {
  cancelButtonStyles,
  saveButtonStyles,
} as const;
