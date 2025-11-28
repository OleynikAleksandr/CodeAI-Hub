import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../types/provider";

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

const RADIO_GROUP_NAME = "provider-picker";

const ProviderOption = ({
  provider,
  checked,
  onToggle,
  inputRef,
}: ProviderOptionProps) => {
  const disabled = !provider.connected;
  const statusLabel = provider.connected ? "Available" : "Unavailable";
  const statusClassName = provider.connected
    ? "provider-picker__label-status provider-picker__label-status--connected"
    : "provider-picker__label-status provider-picker__label-status--disconnected";
  const warning = provider.statusMessage;

  const handleChange = () => {
    onToggle(provider.id);
  };

  return (
    <label
      aria-disabled={disabled}
      className={
        disabled
          ? "provider-picker__option provider-picker__option--disabled"
          : "provider-picker__option"
      }
      htmlFor={provider.id}
    >
      <input
        checked={checked}
        className="provider-picker__checkbox"
        disabled={disabled}
        id={provider.id}
        name={RADIO_GROUP_NAME}
        onChange={handleChange}
        ref={inputRef}
        type="radio"
      />
      <span className="provider-picker__label">
        <span className="provider-picker__label-title">
          {provider.title}
          {provider.description ? (
            <span className="provider-picker__label-description-inline">
              {" "}
              ({provider.description})
            </span>
          ) : null}
        </span>
        <span className={statusClassName}>{statusLabel}</span>
        {warning ? (
          <span className="provider-picker__warning">{warning}</span>
        ) : null}
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
    setSelected(new Set([providerId]));
  };

  const selectedIds = useMemo(() => Array.from(selected.values()), [selected]);
  const selectedProvider = useMemo(
    () => providers.find((provider) => selectedIds[0] === provider.id),
    [providers, selectedIds]
  );

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
        Select exactly one provider for your new session. Install and
        authenticate each CLI before continuing.
      </p>
      <form className="provider-picker__form" onSubmit={handleSubmit}>
        <fieldset className="provider-picker__fieldset">
          <legend className="provider-picker__legend">
            Connected provider stacks
          </legend>
          <div aria-hidden="true" className="provider-picker__spacer" />
          <div className="provider-picker__options">
            {providers.map((provider, index) => renderOption(provider, index))}
          </div>
        </fieldset>
        <div className="provider-picker__actions">
          <output aria-live="polite" className="provider-picker__status">
            {isSubmitDisabled
              ? "Select a provider to continue."
              : `${selectedProvider?.title ?? "Provider"} selected.`}
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
