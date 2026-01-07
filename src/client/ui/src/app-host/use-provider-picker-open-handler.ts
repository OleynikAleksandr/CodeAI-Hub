import { useCallback } from "react";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { FlowStageId } from "../components/flow-wizard";
import { activateRoot } from "../root-dom";

type OpenPickerHandler = (
  providers: readonly ProviderStackDescriptor[]
) => void;

type ProviderPickerOpenHandler = (
  providers: readonly ProviderStackDescriptor[],
  stage: string | null
) => void;

const isFlowStageId = (value: string): value is FlowStageId =>
  value === "chat" ||
  value === "idea" ||
  value === "spec" ||
  value === "plan" ||
  value === "execute";

export const useProviderPickerOpenHandler = (
  openPicker: OpenPickerHandler,
  selectStage: (stage: FlowStageId) => void,
  lockStageSelection: () => void
): ProviderPickerOpenHandler =>
  useCallback(
    (providers, stage) => {
      activateRoot();
      if (providers.length === 0) {
        return;
      }
      openPicker(providers);
      if (stage && isFlowStageId(stage)) {
        lockStageSelection();
        selectStage(stage);
      }
    },
    [lockStageSelection, openPicker, selectStage]
  );
