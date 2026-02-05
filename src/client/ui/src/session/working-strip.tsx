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
    {isWorking ? (
      <>
        <span>Agent is working. Please wait.</span>
        <AnimatedDots theme={providerTheme} />
      </>
    ) : (
      <span className="session-working-strip__spacer" />
    )}
  </output>
);
