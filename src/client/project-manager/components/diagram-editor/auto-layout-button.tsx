import type React from "react";

export type AutoLayoutButtonProps = {
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void | Promise<void>;
};

export const AutoLayoutButton: React.FC<AutoLayoutButtonProps> = ({
  busy = false,
  disabled = false,
  onClick,
}) => (
  <button
    type="button"
    onClick={() => {
      void onClick();
    }}
    disabled={disabled || busy}
    style={{
      height: 32,
      padding: "0 12px",
      borderRadius: 999,
      border: "1px solid var(--pm-border-strong)",
      background: "rgba(66, 201, 162, 0.12)",
      color: "var(--pm-accent-strong)",
      cursor: disabled || busy ? "default" : "pointer",
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {busy ? "Layout..." : "Auto-layout"}
  </button>
);
