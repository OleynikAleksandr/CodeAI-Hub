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
  readonly flowWizardVisible: boolean;
  readonly flowWizardProviderId: ProviderStackId | null;
  readonly openPicker: (providers: readonly ProviderStackDescriptor[]) => void;
  readonly confirmSelection: (providerIds: readonly ProviderStackId[]) => void;
  readonly cancelSelection: () => void;
  readonly resetPicker: () => void;
  readonly openFlowWizard: (providerId: ProviderStackId) => void;
  readonly closeFlowWizard: () => void;
};

export const useProviderPickerState = (): UseProviderPickerStateResult => {
  const [pickerState, setPickerState] =
    useState<ProviderPickerState>(defaultPickerState);
  const [catalog, setCatalog] = useState<ProviderCatalog>({});
  const [flowWizardVisible, setFlowWizardVisible] = useState(false);
  const [flowWizardProviderId, setFlowWizardProviderId] =
    useState<ProviderStackId | null>(null);

  const providerLabels = useMemo(() => buildProviderLabels(catalog), [catalog]);

  const resetPicker = useCallback(() => {
    setPickerState(defaultPickerState);
    setFlowWizardVisible(false);
    setFlowWizardProviderId(null);
  }, []);

  const openPicker = useCallback(
    (providers: readonly ProviderStackDescriptor[]) => {
      setCatalog((previous) => mergeCatalog(previous, providers));
      setPickerState({
        visible: true,
        providers,
      });
      setFlowWizardVisible(false);
      setFlowWizardProviderId(null);
    },
    []
  );

  const openFlowWizard = useCallback((providerId: ProviderStackId) => {
    setFlowWizardVisible(true);
    setFlowWizardProviderId(providerId);
    setPickerState((previous) => ({ ...previous, visible: false }));
  }, []);

  const closeFlowWizard = useCallback(() => {
    setFlowWizardVisible(false);
    setFlowWizardProviderId(null);
    setPickerState((previous) => ({ ...previous, visible: true }));
  }, []);

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
    flowWizardVisible,
    flowWizardProviderId,
    openPicker,
    confirmSelection,
    cancelSelection,
    resetPicker,
    openFlowWizard,
    closeFlowWizard,
  };
};
