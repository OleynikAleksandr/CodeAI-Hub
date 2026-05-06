import type React from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";

const USER_MESSAGES_CATEGORY = "system_feedback";

export const QualityGatesHelp: React.FC = () => {
  const { t } = useLocalization();

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.quality_gates.help.title",
            "Quality Gates Baseline Help"
          )}
        </strong>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.quality_gates.help.intro",
            "Quality Gates Baseline converts the accepted skeleton into concrete verification commands for the generated project."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.quality_gates.help.development_tree_lock",
            "The Development Tree stays disabled until Application Skeleton and Quality Gates Baseline are accepted. This prevents node sessions from writing code before the project shape and verification contract exist."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.quality_gates.help.output",
            "Step output: `.codeai-hub/<workspace>/quality_gates/quality-gates.md` plus `quality-gates.json`."
          )}
        </div>
      </div>
    </div>
  );
};
