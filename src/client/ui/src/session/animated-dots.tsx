import { useEffect } from "react";
import type { ProviderTheme } from "./helpers";

type AnimatedDotsProps = {
  readonly theme?: ProviderTheme | null;
  readonly className?: string;
  readonly ariaHidden?: boolean;
};

const FALLBACK_STYLE_ID = "codeaihub-animated-dots-fallback-style";

const ensureFallbackStyles = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(FALLBACK_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = FALLBACK_STYLE_ID;
  style.textContent = `
.animated-dots{display:inline-flex;align-items:center;gap:3px;margin-left:4px;vertical-align:middle;color:rgba(204,204,204,1)}
.animated-dots__dot{width:6px;height:6px;border-radius:999px;background-color:currentColor;opacity:.3;animation:animated-dots-pulse 1.1s infinite ease-in-out}
.animated-dots__dot--2{animation-delay:.12s}
.animated-dots__dot--3{animation-delay:.24s}
.animated-dots__dot--4{animation-delay:.36s}
.animated-dots__dot--5{animation-delay:.48s}
.animated-dots__dot--6{animation-delay:.6s}
@keyframes animated-dots-pulse{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-1px)}}
`;
  document.head.append(style);
};

const resolveThemeColor = (theme: ProviderTheme | null): string | null => {
  switch (theme) {
    case "claude":
      return "#ff9105";
    case "codex":
      return "#01f0d8";
    case "gemini":
      return "#ab34cb";
    default:
      return null;
  }
};

export const AnimatedDots = ({
  theme = null,
  className,
  ariaHidden = true,
}: AnimatedDotsProps) => {
  useEffect(() => {
    ensureFallbackStyles();
  }, []);

  const themeClass =
    theme === "claude" || theme === "codex" || theme === "gemini"
      ? `animated-dots--${theme}`
      : null;
  const classes = ["animated-dots", themeClass, className]
    .filter(Boolean)
    .join(" ");
  const themeColor = resolveThemeColor(theme);

  return (
    <span
      aria-hidden={ariaHidden}
      className={classes}
      style={themeColor ? { color: themeColor } : undefined}
    >
      <span className="animated-dots__dot" />
      <span className="animated-dots__dot animated-dots__dot--2" />
      <span className="animated-dots__dot animated-dots__dot--3" />
      <span className="animated-dots__dot animated-dots__dot--4" />
      <span className="animated-dots__dot animated-dots__dot--5" />
      <span className="animated-dots__dot animated-dots__dot--6" />
    </span>
  );
};
