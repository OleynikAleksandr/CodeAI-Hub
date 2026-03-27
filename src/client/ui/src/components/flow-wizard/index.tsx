import type { CSSProperties } from "react";

import { FlowStage } from "./flow-stage";
import {
  flowWizardContainerStyles,
  flowWizardHeadingStyles,
  flowWizardStagesRowStyles,
} from "./styles";

export type FlowStageId = "chat" | "idea" | "spec" | "plan" | "execute";

export interface FlowWizardProps {
  readonly activeStage: FlowStageId | null;
  readonly disabledStages?: ReadonlySet<FlowStageId>;
  readonly onStageClick: (stage: FlowStageId) => void;
}

const STAGES: ReadonlyArray<{
  readonly id: FlowStageId;
  readonly title: string;
  readonly subtitle: string;
}> = [
  { id: "chat", title: "Simple Chat", subtitle: "Just talk to the assistant" },
  { id: "idea", title: "Idea", subtitle: "Collect requirements" },
  { id: "spec", title: "Spec", subtitle: "Define architecture" },
  { id: "plan", title: "Plan", subtitle: "Break work into tasks" },
  { id: "execute", title: "Execute", subtitle: "Run the plan" },
];

export const FlowWizard = ({
  activeStage,
  onStageClick,
  disabledStages,
}: FlowWizardProps) => {
  const headingStyles: CSSProperties = flowWizardHeadingStyles;

  return (
    <section
      aria-label="Development flow wizard"
      style={flowWizardContainerStyles}
    >
      <h2 style={headingStyles}>Start</h2>
      <div style={flowWizardStagesRowStyles}>
        {STAGES.map((stage) => {
          const active = stage.id === activeStage;
          const disabled = disabledStages?.has(stage.id) ?? false;
          return (
            <FlowStage
              active={active}
              disabled={disabled}
              id={stage.id}
              key={stage.id}
              onStageClick={onStageClick}
              subtitle={stage.subtitle}
              title={stage.title}
            />
          );
        })}
      </div>
    </section>
  );
};
