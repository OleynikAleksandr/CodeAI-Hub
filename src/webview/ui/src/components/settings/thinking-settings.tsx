import React from "react";

type ThinkingSettingsProps = {
  readonly enabled: boolean;
  readonly maxTokens: number;
  readonly onChange: (enabled: boolean, maxTokens: number) => void;
};

const hideSpinnerStyle = `
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const MIN_THINKING_TOKENS = 2000;
const MAX_THINKING_TOKENS = 32_000;
const THINKING_TOKEN_STEP = 1000;

const ThinkingSettings: React.FC<ThinkingSettingsProps> = ({
  enabled,
  maxTokens,
  onChange,
}) => {
  const handleEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked, maxTokens);
  };

  const handleMaxTokensChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number.parseInt(event.target.value, 10);
    const constrainedValue = Math.min(
      MAX_THINKING_TOKENS,
      Math.max(MIN_THINKING_TOKENS, value || MIN_THINKING_TOKENS)
    );
    onChange(enabled, constrainedValue);
  };

  return (
    <div style={{ marginBottom: "30px" }}>
      <style>{hideSpinnerStyle}</style>
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "15px",
          color: "#e0e0e0",
        }}
      >
        Thinking Settings
      </h3>

      <div
        style={{
          background: "#252526",
          borderRadius: "6px",
          padding: "15px",
          border: "1px solid #3c3c3c",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            cursor: "pointer",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <input
            checked={enabled}
            onChange={handleEnabledChange}
            style={{
              marginTop: "2px",
              width: "16px",
              height: "16px",
              cursor: "pointer",
            }}
            type="checkbox"
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              Enable thinking mode
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#999999",
                lineHeight: "1.4",
              }}
            >
              When enabled, Claude will use deeper reasoning to process complex
              queries. This provides more thoughtful and comprehensive
              responses.
              <br />
              <strong style={{ color: "#d4a36a" }}>Note:</strong> Changes take
              effect when creating a new session.
            </div>
          </div>
        </label>

        <div
          style={{
            paddingLeft: "28px",
            borderTop: "1px solid #3c3c3c",
            paddingTop: "15px",
          }}
        >
          <label style={{ display: "block", marginBottom: "8px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "8px",
              }}
            >
              Maximum thinking tokens
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <button
                onClick={() =>
                  onChange(
                    enabled,
                    Math.max(
                      MIN_THINKING_TOKENS,
                      maxTokens - THINKING_TOKEN_STEP
                    )
                  )
                }
                style={{
                  width: "28px",
                  height: "28px",
                  background: "#2d2d30",
                  border: "1px solid #3c3c3c",
                  borderRadius: "4px",
                  color: "#cccccc",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Decrease by 1000"
                type="button"
              >
                −
              </button>
              <input
                max={MAX_THINKING_TOKENS}
                min={MIN_THINKING_TOKENS}
                onChange={handleMaxTokensChange}
                step={THINKING_TOKEN_STEP}
                style={
                  {
                    width: "100px",
                    padding: "6px 8px",
                    background: "#1e1e1e",
                    border: "1px solid #3c3c3c",
                    borderRadius: "4px",
                    color: "#cccccc",
                    fontSize: "13px",
                    textAlign: "center",
                    MozAppearance: "textfield",
                    appearance: "textfield",
                  } as React.CSSProperties
                }
                type="number"
                value={maxTokens}
              />
              <button
                onClick={() =>
                  onChange(
                    enabled,
                    Math.min(
                      MAX_THINKING_TOKENS,
                      maxTokens + THINKING_TOKEN_STEP
                    )
                  )
                }
                style={{
                  width: "28px",
                  height: "28px",
                  background: "#2d2d30",
                  border: "1px solid #3c3c3c",
                  borderRadius: "4px",
                  color: "#cccccc",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Increase by 1000"
                type="button"
              >
                +
              </button>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#999999",
                marginTop: "8px",
                lineHeight: "1.4",
              }}
            >
              • Normal (4000): Standard reasoning depth
              <br />• Hard (10000): Extended analysis for complex tasks
              <br />• Ultra (32000): Maximum reasoning capacity
            </div>
          </label>
        </div>

        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#1a1a1a",
            borderRadius: "4px",
            border: "1px solid #2d2d30",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#7ca9d3",
              fontWeight: 500,
              marginBottom: "4px",
            }}
          >
            💡 Pro Tip
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#999999",
              lineHeight: "1.4",
            }}
          >
            Use "Ultrathink" anywhere in your message to enable maximum thinking
            (32000 tokens) for that specific query, regardless of your current
            settings.
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ThinkingSettings);
