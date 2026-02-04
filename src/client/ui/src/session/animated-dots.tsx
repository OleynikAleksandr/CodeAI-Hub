import type { ProviderTheme } from "./helpers";

type AnimatedDotsProps = {
  readonly theme?: ProviderTheme | null;
  readonly className?: string;
};

export const AnimatedDots = ({
  theme = null,
  className,
}: AnimatedDotsProps) => {
  const themeClass =
    theme === "claude" || theme === "codex" || theme === "gemini"
      ? `animated-dots--${theme}`
      : null;
  const classes = ["animated-dots", themeClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span aria-hidden="true" className={classes}>
      <span className="animated-dots__dot" />
      <span className="animated-dots__dot animated-dots__dot--2" />
      <span className="animated-dots__dot animated-dots__dot--3" />
    </span>
  );
};
