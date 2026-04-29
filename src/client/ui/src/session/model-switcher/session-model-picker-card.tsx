import { memo } from "react";
import type {
  SessionModelSwitcherModelOption,
  SessionModelSwitcherReasoningOption,
} from "./session-model-switcher-facade";

interface SessionModelPickerCardProps {
  readonly onSelectModel: (modelId: string) => void;
  readonly options: readonly SessionModelSwitcherModelOption[];
  readonly title?: string;
}

interface SessionReasoningPickerCardProps {
  readonly onSelectReasoning: (reasoningId: string) => void;
  readonly options: readonly SessionModelSwitcherReasoningOption[];
  readonly title?: string;
}

interface PickerCardProps {
  readonly compact?: boolean;
  readonly onSelect: (id: string) => void;
  readonly options: readonly {
    readonly description: string;
    readonly id: string;
    readonly label: string;
    readonly selected: boolean;
  }[];
  readonly title: string;
}

const joinClassNames = (
  ...classes: ReadonlyArray<false | string | undefined>
): string => classes.filter(Boolean).join(" ");

const PickerCard = ({ compact, onSelect, options, title }: PickerCardProps) => {
  if (options.length === 0) {
    return null;
  }

  return (
    <div
      aria-label={title}
      className={joinClassNames(
        "session-model-switch-card",
        compact && "session-model-switch-card--compact"
      )}
      role="dialog"
    >
      <div className="session-model-switch-card__title">{title}</div>
      <div className="session-model-switch-card__options">
        {options.map((option) => (
          <button
            aria-pressed={option.selected}
            className={joinClassNames(
              "session-model-switch-card__option",
              option.selected && "session-model-switch-card__option--selected"
            )}
            key={option.id}
            onClick={() => onSelect(option.id)}
            type="button"
          >
            <span className="session-model-switch-card__option-label">
              {option.label}
            </span>
            <span className="session-model-switch-card__option-description">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const SessionModelPickerCard = memo(
  ({
    onSelectModel,
    options,
    title = "Model",
  }: SessionModelPickerCardProps) => (
    <PickerCard onSelect={onSelectModel} options={options} title={title} />
  )
);

export const SessionReasoningPickerCard = memo(
  ({
    onSelectReasoning,
    options,
    title = "Reasoning",
  }: SessionReasoningPickerCardProps) => (
    <PickerCard
      compact
      onSelect={onSelectReasoning}
      options={options}
      title={title}
    />
  )
);
