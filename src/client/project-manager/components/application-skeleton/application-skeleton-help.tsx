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
            "Application Skeleton turns the accepted module graph into the project foundation: language, framework, package layout, and the real filesystem skeleton."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_skeleton.help.lifecycle",
            "The agent first drafts `application-skeleton.md` and `application-skeleton-map.json`. After you explicitly accept that contract, the same agent materializes the workspace folders for Product Parts, Clusters, and Modules."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_skeleton.help.output",
            "Step output: `.codeai-hub/<workspace>/application_skeleton/application-skeleton.md`, `application-skeleton-map.json`, and the materialized project skeleton in the workspace."
          )}
        </div>
      </div>
    </div>
  );
};
