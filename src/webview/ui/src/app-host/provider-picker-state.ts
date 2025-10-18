import { useCallback, useMemo, useState } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import {
  defaultPickerState,
  type ProviderPickerState,
} from "../provider-picker";
import {
  buildProviderLabels,
  mergeCatalog,
  type ProviderCatalog,
} from "../session/helpers";
import { postVsCodeMessage } from "../vscode";

export type ProviderLabels = ReturnType<typeof buildProviderLabels>;

export type UseProviderPickerStateResult = {
  readonly pickerState: ProviderPickerState;
  readonly providerLabels: ProviderLabels;
  readonly openPicker: (providers: readonly ProviderStackDescriptor[]) => void;
  readonly confirmSelection: (providerIds: readonly ProviderStackId[]) => void;
  readonly cancelSelection: () => void;
  readonly resetPicker: () => void;
};

export const useProviderPickerState = (): UseProviderPickerStateResult => {
  const [pickerState, setPickerState] =
    useState<ProviderPickerState>(defaultPickerState);
  const [catalog, setCatalog] = useState<ProviderCatalog>({});

  const providerLabels = useMemo(() => buildProviderLabels(catalog), [catalog]);

  const resetPicker = useCallback(() => {
    setPickerState(defaultPickerState);
  }, []);

  const openPicker = useCallback(
    (providers: readonly ProviderStackDescriptor[]) => {
      setCatalog((previous) => mergeCatalog(previous, providers));
      setPickerState({
        visible: true,
        providers,
      });
    },
    []
  );

  const confirmSelection = useCallback(
    (providerIds: readonly ProviderStackId[]) => {
      postVsCodeMessage({
        type: "providerPicker:confirm",
        payload: { providerIds },
      });
      resetPicker();
    },
    [resetPicker]
  );

  const cancelSelection = useCallback(() => {
    postVsCodeMessage({ type: "providerPicker:cancel" });
    resetPicker();
  }, [resetPicker]);

  return {
    pickerState,
    providerLabels,
    openPicker,
    confirmSelection,
    cancelSelection,
    resetPicker,
  };
};
