import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";

const UI_LABELS_CATEGORY = "ui_interface";

type DescriptionProviderPickerProps = {
  readonly visible: boolean;
  readonly providers: readonly ProviderStackDescriptor[];
  readonly onConfirm: (providerId: ProviderStackId) => void;
  readonly onCancel: () => void;
};

export const DescriptionProviderPicker = ({
  visible,
  providers,
  onConfirm,
  onCancel,
}: DescriptionProviderPickerProps) => {
  const { t } = useLocalization();
  const [selected, setSelected] = useState<ProviderStackId | null>(null);
  const firstOptionRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (visible && firstOptionRef.current) {
      firstOptionRef.current.focus();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setSelected(null);
    }
  }, [visible]);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selected) ?? null,
    [providers, selected]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      return;
    }
    onConfirm(selected);
  };

  if (!visible) {
    return null;
  }

  const title = t(
    UI_LABELS_CATEGORY,
    "pm.description.provider_picker.title",
    "Select provider"
  );
  const availableLabel = t(
    UI_LABELS_CATEGORY,
    "pm.description.provider_picker.available_label",
    "Available"
  );
  const unavailableLabel = t(
    UI_LABELS_CATEGORY,
    "pm.description.provider_picker.unavailable_label",
    "Unavailable"
  );
  const cancelLabel = t(
    UI_LABELS_CATEGORY,
    "pm.description.provider_picker.cancel_label",
    "Cancel"
  );
  const startLabel = t(
    UI_LABELS_CATEGORY,
    "pm.description.provider_picker.start_label",
    "Start"
  );

  const statusMessage =
    providers.length === 0
      ? "Провайдеры не найдены. Проверьте запуск ядра."
      : selectedProvider
        ? `${selectedProvider.title} выбран.`
        : "Выберите провайдера для запуска шага Description.";

  return (
    <div className="pm-provider-picker-overlay">
      <section
        aria-modal="true"
        aria-labelledby="pm-provider-picker-title"
        className="pm-provider-picker"
        role="dialog"
      >
        <header className="pm-provider-picker__header">
          <h2 className="pm-provider-picker__title" id="pm-provider-picker-title">
            {title}
          </h2>
          <p className="pm-provider-picker__description">
            Шаг Description поддерживает Claude, Codex и Gemini. Провайдер должен
            быть установлен и авторизован.
          </p>
        </header>
        <form className="pm-provider-picker__form" onSubmit={handleSubmit}>
          <div className="pm-provider-picker__options">
            {providers.map((provider, index) => {
              const disabled = !provider.connected;
              const inputRef =
                index === 0
                  ? (element: HTMLInputElement | null) => {
                      firstOptionRef.current = element;
                    }
                  : undefined;
              return (
                <label
                  key={provider.id}
                  aria-disabled={disabled}
                  className={
                    disabled
                      ? "pm-provider-picker__option pm-provider-picker__option--disabled"
                      : "pm-provider-picker__option"
                  }
                >
                  <input
                    checked={provider.id === selected}
                    className="pm-provider-picker__radio"
                    disabled={disabled}
                    name="pm-provider-picker"
                    onChange={() => setSelected(provider.id)}
                    ref={inputRef}
                    type="radio"
                  />
                  <span className="pm-provider-picker__label">
                    <span className="pm-provider-picker__label-title">
                      {provider.title}
                      {provider.description ? (
                        <span className="pm-provider-picker__label-description">
                          {" "}
                          ({provider.description})
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={
                        provider.connected
                          ? "pm-provider-picker__status pm-provider-picker__status--connected"
                          : "pm-provider-picker__status pm-provider-picker__status--disconnected"
                      }
                    >
                      {provider.connected ? availableLabel : unavailableLabel}
                    </span>
                    {provider.statusMessage ? (
                      <span className="pm-provider-picker__warning">
                        {provider.statusMessage}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="pm-provider-picker__actions">
            <output aria-live="polite" className="pm-provider-picker__status-line">
              {statusMessage}
            </output>
            <div className="pm-provider-picker__buttons">
              <button
                className="pm-provider-picker__button"
                onClick={onCancel}
                type="button"
              >
                {cancelLabel}
              </button>
              <button
                className="pm-provider-picker__button pm-provider-picker__button--primary"
                disabled={!selected}
                type="submit"
              >
                {startLabel}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};
