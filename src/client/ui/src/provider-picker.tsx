import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";

export type ProviderPickerState = {
  readonly visible: boolean;
  readonly providers: readonly ProviderStackDescriptor[];
};

export const defaultPickerState: ProviderPickerState = {
  visible: false,
  providers: [],
};

type ProviderPickerProps = {
  readonly visible: boolean;
  readonly providers: readonly ProviderStackDescriptor[];
  readonly onConfirm: (providerIds: readonly ProviderStackId[]) => void;
  readonly onCancel: () => void;
};

type ProviderOptionProps = {
  readonly provider: ProviderStackDescriptor;
  readonly checked: boolean;
  readonly onToggle: (id: ProviderStackId) => void;
  readonly inputRef?: (element: HTMLInputElement | null) => void;
};

const ProviderOption = ({
  provider,
  checked,
  onToggle,
  inputRef,
}: ProviderOptionProps) => {
  const handleChange = () => {
    onToggle(provider.id);
  };

  return (
    <label className="provider-picker__option" htmlFor={provider.id}>
      <input
        checked={checked}
        className="provider-picker__checkbox"
        id={provider.id}
        onChange={handleChange}
        ref={inputRef}
        type="checkbox"
      />
      <span className="provider-picker__label">
        <span className="provider-picker__label-title">{provider.title}</span>
        <span className="provider-picker__label-description">
          {provider.description}
        </span>
      </span>
    </label>
  );
};

export const ProviderPicker = ({
  visible,
  providers,
  onConfirm,
  onCancel,
}: ProviderPickerProps) => {
  const [selected, setSelected] = useState<Set<ProviderStackId>>(
    () => new Set()
  );
  const firstOptionRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (visible && firstOptionRef.current) {
      firstOptionRef.current.focus();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setSelected(new Set());
    }
  }, [visible]);

  const toggleProvider = (providerId: ProviderStackId) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  const selectedIds = useMemo(() => Array.from(selected.values()), [selected]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedIds.length === 0) {
      return;
    }
    onConfirm(selectedIds);
  };

  const handleCancel = () => {
    onCancel();
  };

  if (!visible) {
    return null;
  }

  const renderOption = (provider: ProviderStackDescriptor, index: number) => {
    const refCallback =
      index === 0
        ? (element: HTMLInputElement | null) => {
            firstOptionRef.current = element;
          }
        : undefined;

    return (
      <ProviderOption
        checked={selected.has(provider.id)}
        inputRef={refCallback}
        key={provider.id}
        onToggle={toggleProvider}
        provider={provider}
      />
    );
  };

  const isSubmitDisabled = selectedIds.length === 0;

  return (
    <section
      aria-labelledby="provider-picker-heading"
      className="provider-picker"
    >
      <h2 className="provider-picker__title" id="provider-picker-heading">
        Choose providers
      </h2>
      <p className="provider-picker__description">
        Select one or more providers to include in your new session.
        Combinations allow multi-agent orchestration.
      </p>
      <form className="provider-picker__form" onSubmit={handleSubmit}>
        <fieldset className="provider-picker__fieldset">
          <legend className="provider-picker__legend">
            Connected provider stacks
          </legend>
          <div className="provider-picker__options">
            {providers.map((provider, index) => renderOption(provider, index))}
          </div>
        </fieldset>
        <div className="provider-picker__actions">
          <output aria-live="polite" className="provider-picker__status">
            {isSubmitDisabled
              ? "Select at least one provider to continue."
              : `${selectedIds.length} provider${
                  selectedIds.length > 1 ? "s" : ""
                } selected.`}
          </output>
          <div className="provider-picker__action-buttons">
            <button
              className="provider-picker__secondary"
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="provider-picker__primary"
              disabled={isSubmitDisabled}
              type="submit"
            >
              Start session
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
