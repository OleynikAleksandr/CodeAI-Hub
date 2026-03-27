import { memo } from "react";
import ResponseModeCard from "./response-mode-card";
import type { GeneralResponseMode } from "./response-mode-copy";
import type { GeneralResponsePolicySettings } from "./response-mode-state";

interface GeneralResponseModeFacadeProps {
  readonly onModeChange: (mode: GeneralResponseMode) => void;
  readonly onStrictInstructionTextChange: (value: string) => void;
  readonly onStrictSchemaTextChange: (value: string) => void;
  readonly responsePolicy: GeneralResponsePolicySettings;
}

const GeneralResponseModeFacade = (props: GeneralResponseModeFacadeProps) => (
  <ResponseModeCard {...props} />
);

export default memo(GeneralResponseModeFacade);
