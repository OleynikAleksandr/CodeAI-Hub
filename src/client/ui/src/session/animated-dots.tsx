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
.animated-dots__dot{width:calc(6px*var(--animated-dots-scale,1));height:calc(6px*var(--animated-dots-scale,1));border-radius:999px;background-color:currentColor;opacity:0;animation-duration:1.4s;animation-iteration-count:infinite;animation-timing-function:ease-in-out;will-change:opacity}
.animated-dots__dot--1{--animated-dots-scale:1;--animated-dots-alpha:1;animation-name:animated-dots-reveal-1}
.animated-dots__dot--2{--animated-dots-scale:.95;--animated-dots-alpha:.95;animation-name:animated-dots-reveal-2}
.animated-dots__dot--3{--animated-dots-scale:.9;--animated-dots-alpha:.9;animation-name:animated-dots-reveal-3}
.animated-dots__dot--4{--animated-dots-scale:.85;--animated-dots-alpha:.85;animation-name:animated-dots-reveal-4}
.animated-dots__dot--5{--animated-dots-scale:.8;--animated-dots-alpha:.8;animation-name:animated-dots-reveal-5}
.animated-dots__dot--6{--animated-dots-scale:.75;--animated-dots-alpha:.75;animation-name:animated-dots-reveal-6}
@keyframes animated-dots-reveal-1{0%{opacity:0}8%{opacity:var(--animated-dots-alpha)}92%{opacity:var(--animated-dots-alpha)}100%{opacity:0}}
@keyframes animated-dots-reveal-2{0%,16.67%{opacity:0}24.67%{opacity:var(--animated-dots-alpha)}92%{opacity:var(--animated-dots-alpha)}100%{opacity:0}}
@keyframes animated-dots-reveal-3{0%,33.33%{opacity:0}41.33%{opacity:var(--animated-dots-alpha)}92%{opacity:var(--animated-dots-alpha)}100%{opacity:0}}
@keyframes animated-dots-reveal-4{0%,50%{opacity:0}58%{opacity:var(--animated-dots-alpha)}92%{opacity:var(--animated-dots-alpha)}100%{opacity:0}}
@keyframes animated-dots-reveal-5{0%,66.67%{opacity:0}74.67%{opacity:var(--animated-dots-alpha)}92%{opacity:var(--animated-dots-alpha)}100%{opacity:0}}
@keyframes animated-dots-reveal-6{0%,83.33%{opacity:0}91.33%{opacity:var(--animated-dots-alpha)}92%{opacity:var(--animated-dots-alpha)}100%{opacity:0}}
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
      <span className="animated-dots__dot animated-dots__dot--1" />
      <span className="animated-dots__dot animated-dots__dot--2" />
      <span className="animated-dots__dot animated-dots__dot--3" />
      <span className="animated-dots__dot animated-dots__dot--4" />
      <span className="animated-dots__dot animated-dots__dot--5" />
      <span className="animated-dots__dot animated-dots__dot--6" />
    </span>
  );
};
