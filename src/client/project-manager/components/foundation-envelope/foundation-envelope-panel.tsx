import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";

const UI_LABELS_CATEGORY = "ui_interface";
const USER_MESSAGES_CATEGORY = "system_feedback";
const startService = new WorkflowStepStartService();

export const FoundationEnvelopeHelp: React.FC = () => {
  const { t } = useLocalization();

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.foundation_envelope.help.title",
            "Foundation Envelope Help"
          )}
        </strong>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.foundation_envelope.help.intro",
            "In the Foundation Envelope step, the agent turns the completed Diagram Modules artifacts into the canonical application-wide assembly baseline. The document must make the Application Root, Shared Zones, Integration Seams, technology intent, and placement/dependency rules explicit enough for downstream branch specifications."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.foundation_envelope.help.inputs",
            "The step starts from `Final_Description.md`, `virtual-simulation.md`, `product-parts.index.md`, and the completed `product-parts/<part-id>.md` artifacts from Diagram Modules."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.foundation_envelope.help.dialog_intro",
            "What is most useful to clarify in the dialog:"
          )}
          <ul style={{ marginTop: 6 }}>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.foundation_envelope.help.dialog_item_1",
                "what counts as the `Application Root` and the outer shell of the whole product;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.foundation_envelope.help.dialog_item_2",
                "which zones are shared across multiple Product Parts and must not be hidden inside one branch;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.foundation_envelope.help.dialog_item_3",
                "which `Integration Seams` and cross-part responsibilities must stay explicit before branch-level specs begin;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.foundation_envelope.help.dialog_item_4",
                "which technology decisions, placement rules, and dependency directions are fixed, proposed, or still open."
              )}
            </li>
          </ul>
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.foundation_envelope.help.scope",
            "`foundation-envelope.md` is not a low-level module contract, not an implementation scaffold, and not a visual layout file. It captures the stable application-wide assembly baseline that downstream docs must inherit."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.foundation_envelope.help.output",
            "Step output: `.codeai-hub/<workspace>/foundation_envelope/foundation-envelope.md`."
          )}
        </div>
      </div>
    </div>
  );
};

export const FoundationEnvelopePanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const { t } = useLocalization();
  const stageLabel = t(
    UI_LABELS_CATEGORY,
    "pm.workflow.stage.foundation_envelope.label",
    "Foundation Envelope"
  );
  const loadErrorFallback = t(
    USER_MESSAGES_CATEGORY,
    "pm.foundation_envelope.error.load",
    "Could not load Foundation Envelope."
  );
  const artifactPath = useMemo(
    () =>
      `.codeai-hub/${props.workspaceSlug}/foundation_envelope/foundation-envelope.md`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
    artifactPath,
    stageLabel,
  });
  const validationError =
    content && content.trim().length === 0 ? "Файл пустой." : null;

  const handleFixStart = useCallback(
    async (params: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startFoundationEnvelope({
        workspacePath: params.workspacePath,
        workspaceSlug: params.workspaceSlug,
        providerId: params.providerId as ProviderStackId,
      });
    },
    []
  );

  if (status === "ready" && content !== null) {
    return (
      <StageArtifactContentView
        artifactPath={artifactPath}
        content={content}
        displayFileName="foundation-envelope.md"
        onFixStart={handleFixStart}
        validationError={validationError}
        workspacePath={props.workspacePath}
        workspaceSlug={props.workspaceSlug}
      />
    );
  }

  if (status === "error") {
    return <div className="pm-placeholder">{error ?? loadErrorFallback}</div>;
  }

  return <FoundationEnvelopeHelp />;
};
