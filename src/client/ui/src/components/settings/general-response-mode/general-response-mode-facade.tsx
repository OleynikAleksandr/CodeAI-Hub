import { memo } from "react";
import ResponseModeCard from "./response-mode-card";
import type { GeneralResponseMode } from "./response-mode-copy";
import type { GeneralResponsePolicySettings } from "./response-mode-state";

type GeneralResponseModeFacadeProps = {
  readonly responsePolicy: GeneralResponsePolicySettings;
  readonly onModeChange: (mode: GeneralResponseMode) => void;
  readonly onStrictSchemaTextChange: (value: string) => void;
  readonly onStrictInstructionTextChange: (value: string) => void;
};

const GeneralResponseModeFacade = (props: GeneralResponseModeFacadeProps) => (
  <ResponseModeCard {...props} />
);

export default memo(GeneralResponseModeFacade);
