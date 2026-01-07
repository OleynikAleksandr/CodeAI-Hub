import { useCallback, useMemo, useState } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type { FlowStageId } from "../components/flow-wizard";
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
  readonly selectedStage: FlowStageId | null;
  readonly stageSelectionLocked: boolean;
  readonly openPicker: (providers: readonly ProviderStackDescriptor[]) => void;
  readonly confirmSelection: (providerIds: readonly ProviderStackId[]) => void;
  readonly cancelSelection: () => void;
  readonly resetPicker: () => void;
  readonly selectStage: (stage: FlowStageId) => void;
  readonly clearStageSelection: () => void;
  readonly lockStageSelection: () => void;
};

export const useProviderPickerState = (): UseProviderPickerStateResult => {
  const [pickerState, setPickerState] =
    useState<ProviderPickerState>(defaultPickerState);
  const [catalog, setCatalog] = useState<ProviderCatalog>({});
  const [selectedStage, setSelectedStage] = useState<FlowStageId | null>(null);
  const [stageSelectionLocked, setStageSelectionLocked] = useState(false);

  const providerLabels = useMemo(() => buildProviderLabels(catalog), [catalog]);

  const resetPicker = useCallback(() => {
    setPickerState(defaultPickerState);
    setSelectedStage(null);
    setStageSelectionLocked(false);
  }, []);

  const openPicker = useCallback(
    (providers: readonly ProviderStackDescriptor[]) => {
      setCatalog((previous) => mergeCatalog(previous, providers));
      setPickerState({
        visible: true,
        providers,
      });
      setSelectedStage(null);
      setStageSelectionLocked(false);
    },
    []
  );

  const selectStage = useCallback((stage: FlowStageId) => {
    setSelectedStage(stage);
  }, []);

  const clearStageSelection = useCallback(() => {
    setSelectedStage(null);
  }, []);

  const lockStageSelection = useCallback(() => {
    setStageSelectionLocked(true);
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
    selectedStage,
    stageSelectionLocked,
    openPicker,
    confirmSelection,
    cancelSelection,
    resetPicker,
    selectStage,
    clearStageSelection,
    lockStageSelection,
  };
};
