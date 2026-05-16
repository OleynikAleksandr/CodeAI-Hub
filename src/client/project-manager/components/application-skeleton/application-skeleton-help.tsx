import type React from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";

const USER_MESSAGES_CATEGORY = "system_feedback";

export const ApplicationSkeletonHelp: React.FC = () => {
  const { t } = useLocalization();

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_skeleton.help.title",
            "Application Skeleton Help"
          )}
        </strong>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_skeleton.help.intro",
            "Application Skeleton turns the accepted module graph into an installable project foundation: language, framework, package/workspace layout, deterministic install metadata, minimal entrypoints, and the real filesystem skeleton."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_skeleton.help.lifecycle",
            "The agent first drafts `application-skeleton.md` and `application-skeleton-map.json`. It must resolve open stack/build/source-layout questions before materialization. After you explicitly accept that contract, the same agent materializes the project foundation and Product Part / Cluster / Module folders."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_skeleton.help.output",
            "Step output: `.codeai-hub/<workspace>/application_skeleton/application-skeleton.md`, `application-skeleton-map.json`, package/config/source foundation files, and the materialized project skeleton in the workspace."
          )}
        </div>
      </div>
    </div>
  );
};
