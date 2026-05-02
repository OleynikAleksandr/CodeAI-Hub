import React from "react";
import { CaptureWorkbenchDomListboxSelector } from "./dom-listbox-selector";
import type { CaptureWorkbenchListboxOption } from "./dom-listbox-selector";

interface StepOption {
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: string;
}

const STEP_GROUPS: readonly {
  readonly label: string;
  readonly options: readonly StepOption[];
}[] = [
  {
    label: "Trunk Workflow",
    options: [
      { value: "description", label: "Description" },
      { value: "virtual_simulation", label: "Virtual Simulation" },
      { value: "diagram_modules", label: "Diagram Modules" },
    ],
  },
  {
    label: "Translation",
    options: [{ value: "translation", label: "Translation" }],
  },
  {
    label: "Development Tree",
    options: [{ value: "development_tree", label: "Development Tree", disabled: true }],
  },
];

interface CaptureWorkbenchStepSelectorProps {
  readonly onChange: (step: string) => void;
  readonly value: string;
}

export const CaptureWorkbenchStepSelector: React.FC<
  CaptureWorkbenchStepSelectorProps
> = ({ onChange, value }) => (
  <CaptureWorkbenchDomListboxSelector
    label="Step"
    onChange={onChange}
    options={STEP_OPTIONS}
    value={value}
  />
);

const STEP_OPTIONS: readonly CaptureWorkbenchListboxOption[] =
  STEP_GROUPS.flatMap((group) =>
    group.options.map((option) => ({
      ...option,
      groupLabel: group.label,
    }))
  );
