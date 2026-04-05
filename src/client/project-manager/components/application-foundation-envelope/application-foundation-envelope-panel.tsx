import type React from "react";
import { useCallback, useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { useStageArtifactLoader } from "../shared/use-stage-artifact-loader";
import { StageArtifactContentView } from "../shared/stage-artifact-content-view";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";

const USER_MESSAGES_CATEGORY = "system_feedback";
const startService = new WorkflowStepStartService();

export const ApplicationFoundationEnvelopeHelp: React.FC = () => {
  const { t } = useLocalization();

  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_foundation_envelope.help.title",
            "Application Foundation Envelope Help"
          )}
        </strong>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_foundation_envelope.help.intro",
            "In this step, the agent turns the upstream workflow artifacts into the canonical text envelope of the whole application. The output must stay readable for the user while becoming explicit enough for downstream branch specifications and contracts."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_foundation_envelope.help.inputs",
            "The step starts from `Final_Description.md`, `virtual-simulation.md`, `product-parts.index.md`, and the staged `product-parts/<part-id>.md` files from Diagram Modules."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_foundation_envelope.help.dialog_intro",
            "What is most useful to clarify in the dialog:"
          )}
          <ul style={{ marginTop: 6 }}>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.application_foundation_envelope.help.dialog_item_1",
                "which application-wide boundaries are already stable;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.application_foundation_envelope.help.dialog_item_2",
                "which Product Parts define the backbone of the system;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.application_foundation_envelope.help.dialog_item_3",
                "which cross-part responsibilities must stay explicit before branch-level specs begin;"
              )}
            </li>
            <li>
              {t(
                USER_MESSAGES_CATEGORY,
                "pm.application_foundation_envelope.help.dialog_item_4",
                "which assumptions are still provisional and should remain marked as hypotheses."
              )}
            </li>
          </ul>
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_foundation_envelope.help.scope",
            "`application-foundation-envelope.md` is not a low-level module contract and not a visual layout file. It captures the stable application-wide shell, boundaries, and responsibility frame that downstream docs must inherit."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.application_foundation_envelope.help.output",
            "Step output: `.codeai-hub/<workspace>/application_foundation_envelope/application-foundation-envelope.md`."
          )}
        </div>
      </div>
    </div>
  );
};

export const ApplicationFoundationEnvelopePanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = (props) => {
  const artifactPath = useMemo(
    () =>
      `.codeai-hub/${props.workspaceSlug}/application_foundation_envelope/application-foundation-envelope.md`,
    [props.workspaceSlug]
  );
  const { status, content, error } = useStageArtifactLoader({
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
    artifactPath,
    stageLabel: "Application Foundation Envelope",
  });
  const validationError =
    content && content.trim().length === 0 ? "Файл пустой." : null;

  const handleFixStart = useCallback(
    async (params: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startApplicationFoundationEnvelope({
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
        displayFileName="application-foundation-envelope.md"
        onFixStart={handleFixStart}
        validationError={validationError}
        workspacePath={props.workspacePath}
        workspaceSlug={props.workspaceSlug}
      />
    );
  }

  if (status === "error") {
    return (
      <div className="pm-placeholder">
        {error ?? "Could not load Application Foundation Envelope."}
      </div>
    );
  }

  return <ApplicationFoundationEnvelopeHelp />;
};
