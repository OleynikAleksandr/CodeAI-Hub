import type { CSSProperties } from "react";

import { FlowStage } from "./flow-stage";
import {
  flowWizardContainerStyles,
  flowWizardHeadingStyles,
  flowWizardStagesRowStyles,
} from "./styles";

export type FlowStageId = "idea" | "spec" | "plan" | "execute";

export type FlowWizardProps = {
  readonly activeStage: FlowStageId;
  readonly onStageClick: (stage: FlowStageId) => void;
};

const STAGES: ReadonlyArray<{
  readonly id: FlowStageId;
  readonly title: string;
  readonly subtitle: string;
}> = [
  { id: "idea", title: "Idea", subtitle: "Collect requirements" },
  { id: "spec", title: "Spec", subtitle: "Define architecture" },
  { id: "plan", title: "Plan", subtitle: "Break work into tasks" },
  { id: "execute", title: "Execute", subtitle: "Run the plan" },
];

export const FlowWizard = ({ activeStage, onStageClick }: FlowWizardProps) => {
  const headingStyles: CSSProperties = flowWizardHeadingStyles;

  return (
    <section
      aria-label="Development flow wizard"
      style={flowWizardContainerStyles}
    >
      <h2 style={headingStyles}>Flow</h2>
      <div style={flowWizardStagesRowStyles}>
        {STAGES.map((stage) => {
          const active = stage.id === activeStage;
          const disabled = !active;
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
