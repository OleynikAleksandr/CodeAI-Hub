import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { DiagramStagePanelScaffold } from "../diagram-editor/diagram-stage-panel-scaffold";
import { useDiagramLoader } from "../diagram-editor/use-diagram-loader";
import { useDiagramPersistence } from "../diagram-editor/use-diagram-persistence";

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
            "`foundation-envelope.md` is not a low-level module contract, not an implementation scaffold, and not a user-owned layout file. It captures the stable application-wide assembly baseline that downstream docs must inherit, and the runtime can project a diagram from it."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.foundation_envelope.help.structure",
            "Keep the document projection-friendly: make Application Root, Product Parts, Shared Zones, and Integration Seams easy to identify with stable section headings and explicit field lines where needed."
          )}
        </div>
        <div>
          {t(
            USER_MESSAGES_CATEGORY,
            "pm.foundation_envelope.help.output",
            "Step outputs: `.codeai-hub/<workspace>/foundation_envelope/foundation-envelope.md` as the semantic SSOT, plus optional runtime-owned `.codeai-hub/<workspace>/foundation_envelope/foundation-envelope.flow.json` for layout/view state."
          )}
        </div>
      </div>
    </div>
  );
};

export const FoundationEnvelopePanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly refreshKey?: number;
}> = (props) => {
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  useEffect(() => {
    const handler = () => setLocalRefreshKey((current) => current + 1);
    window.addEventListener("pm:diagram:refresh", handler);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("pm:diagram:sidecar-sync");
      bc.onmessage = handler;
    } catch {
      // unsupported
    }
    return () => {
      window.removeEventListener("pm:diagram:refresh", handler);
      bc?.close();
    };
  }, []);
  const { t } = useLocalization();
  const stageLabel = t(
    UI_LABELS_CATEGORY,
    "pm.workflow.stage.foundation_envelope.label",
    "Foundation Envelope"
  );
  const combinedRefreshKey = (props.refreshKey ?? 0) + localRefreshKey;
  const { status, content, error, projection, artifactPath, flowSidecarPath } =
    useDiagramLoader({
      refreshKey: combinedRefreshKey,
      stage: "foundation_envelope",
      workspacePath: props.workspacePath,
      workspaceSlug: props.workspaceSlug,
    });
  const { persistNodes } = useDiagramPersistence({
    artifactPath,
    flowSidecarPath,
    stage: "foundation_envelope",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });

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
  const visualProjection = status === "ready" ? projection : null;

  if (status === "missing") {
    return <FoundationEnvelopeHelp />;
  }

  return (
    <DiagramStagePanelScaffold
      artifactFileName="foundation-envelope.md"
      artifactPath={artifactPath}
      children={null}
      conflicts={[]}
      content={content}
      error={error}
      initialNodes={projection?.nodes}
      introText="Artifacts show the Foundation Envelope assembly map derived from `foundation-envelope.md`. The runtime keeps `foundation-envelope.flow.json` as layout state only."
      onDismissConflicts={() => {}}
      onNodesChange={async (nodes) => {
        if (!visualProjection) {
          return;
        }
        await persistNodes({ nodes, revision: visualProjection.revision });
      }}
      onStartFix={handleFixStart}
      pendingContent={<FoundationEnvelopeHelp />}
      projection={visualProjection}
      status={status}
      title={stageLabel}
      workspacePath={props.workspacePath}
      workspaceSlug={props.workspaceSlug}
    />
  );
};
