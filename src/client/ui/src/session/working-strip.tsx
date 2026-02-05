import { AnimatedDots } from "./animated-dots";
import type { ProviderTheme } from "./helpers";

type WorkingStripProps = {
  readonly isWorking: boolean;
  readonly providerTheme: ProviderTheme | null;
};

export const WorkingStrip = ({
  isWorking,
  providerTheme,
}: WorkingStripProps) => (
  <output aria-live="polite" className="session-panel session-working-strip">
    <span
      className={
        isWorking
          ? "session-working-strip__text"
          : "session-working-strip__text session-working-strip__text--hidden"
      }
    >
      Agent is working. Please wait.
    </span>
    <span
      className={
        isWorking
          ? "session-working-strip__dots"
          : "session-working-strip__dots session-working-strip__dots--hidden"
      }
    >
      <AnimatedDots theme={providerTheme} />
    </span>
  </output>
);
