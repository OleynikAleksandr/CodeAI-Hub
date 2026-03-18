import type React from "react";
import { useCallback, useEffect } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { domainModelToReactFlow } from "../diagram-editor/adapters/domain-model-to-react-flow";
import { applyFacadeDomainPatch } from "../diagram-editor/apply-facade-domain-patch";
import { applyFacadeRelationPatch } from "../diagram-editor/apply-facade-relation-patch";
import { DiagramEditorSection } from "../diagram-editor/diagram-editor-section";
import { DiagramStagePanelScaffold } from "../diagram-editor/diagram-stage-panel-scaffold";
import {
  mergeFacadeConflicts,
  type FacadeSemanticPatch,
} from "../diagram-editor/facade-conflict-merge";
import { FacadeEntityEditor } from "../diagram-editor/facade-entity-editor";
import { FacadeMethodsEditor } from "../diagram-editor/facade-methods-editor";
import type { FacadeDomainPatch } from "../diagram-editor/facade-domain-patches";
import { resolveLocalEditOrigin } from "../diagram-editor/module-origin-rules";
import { FacadePortsEditor } from "../diagram-editor/facade-ports-editor";
import { FacadeRelationEditor } from "../diagram-editor/facade-relation-editor";
import { useDomainPatch } from "../diagram-editor/use-domain-patch";
import { useDiagramLoader } from "../diagram-editor/use-diagram-loader";
import { useDiagramPersistence } from "../diagram-editor/use-diagram-persistence";

const startService = new WorkflowStepStartService();

export const DiagramFacadesPanel: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly refreshKey?: number;
}> = (props) => {
  const {
    status,
    content,
    error,
    model,
    projection,
    artifactPath,
    flowSidecarPath,
  } = useDiagramLoader({
    refreshKey: props.refreshKey,
    stage: "diagram_facades",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });
  const {
    saveState,
    persistNodes,
    persistModel,
    markConflict,
    clearConflict,
  } = useDiagramPersistence({
    artifactPath,
    flowSidecarPath,
    stage: "diagram_facades",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });
  const {
    model: editableModel,
    conflicts,
    applyDomainPatch,
    clearConflicts,
  } = useDomainPatch<
    Extract<typeof model, { readonly stage: "diagram_facades" }>,
    FacadeSemanticPatch
  >({
    baseModel: model?.stage === "diagram_facades" ? model : null,
    applyPatch: (currentModel, patch) =>
      patch.type === "add-facade" ||
      patch.type === "update-facade" ||
      patch.type === "delete-facade"
        ? applyFacadeDomainPatch(currentModel, patch as FacadeDomainPatch)
        : applyFacadeRelationPatch(currentModel, patch),
    mergeIncoming: (incoming, patches) => mergeFacadeConflicts({ incoming, patches }),
    persistModel,
  });

  const handleFixStart = useCallback(
    async (p: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startDiagramFacades({
        workspacePath: p.workspacePath,
        workspaceSlug: p.workspaceSlug,
        providerId: p.providerId as ProviderStackId,
      });
    },
    []
  );

  useEffect(() => {
    if (conflicts.length > 0) {
      markConflict();
      return;
    }
    clearConflict();
  }, [clearConflict, conflicts.length, markConflict]);

  const visualProjection =
    status === "ready" && editableModel ? domainModelToReactFlow(editableModel) : null;

  return (
    <DiagramStagePanelScaffold
      artifactFileName="facade-map.md"
      artifactPath={artifactPath}
      conflicts={conflicts}
      content={content}
      error={error}
      initialNodes={projection?.nodes}
      introText="Artifacts shows the visual facade diagram. Use Source for the canonical Markdown artifact."
      onDismissConflicts={clearConflicts}
      onNodesChange={async (nodes) => {
        if (!visualProjection) {
          return;
        }
        await persistNodes({ nodes, revision: visualProjection.revision });
      }}
      onStartFix={handleFixStart}
      pendingContent={
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            Здесь отображается visual facade diagram. Canonical Markdown source
            доступен через вкладку <code>Source</code>.
          </div>
          <div>
            После появления <code>facade-map.md</code> панель автоматически
            откроет diagram-first surface.
          </div>
          <div>
            Любые изменения пометят следующие шаги как требующие синхронизации.
          </div>
        </div>
      }
      projection={visualProjection}
      saveState={saveState}
      status={status}
      title="Diagram Facades"
      workspacePath={props.workspacePath}
      workspaceSlug={props.workspaceSlug}
    >
      {editableModel ? (
        <>
          <DiagramEditorSection
            defaultOpen={editableModel.facades.length === 0}
            description="Add, update, or remove facades after reviewing the diagram."
            title="Edit facades"
          >
            <FacadeEntityEditor
              facades={editableModel.facades}
              onAddFacade={async (draft) => {
                await applyDomainPatch({ type: "add-facade", facade: draft });
              }}
              onDeleteFacade={async (facadeId) => {
                await applyDomainPatch({ type: "delete-facade", facadeId });
              }}
              onUpdateFacade={async (facadeId, draft) => {
                const current = editableModel.facades.find(
                  (entity) => entity.id === facadeId
                );
                if (!current) {
                  return;
                }
                await applyDomainPatch({
                  type: "update-facade",
                  facadeId,
                  changes: {
                    module: draft.module,
                    visibility: draft.visibility,
                    contractTargets: draft.contractTargets,
                    codeTargets: draft.codeTargets,
                    notes: draft.notes,
                    rationale: draft.rationale,
                    origin: resolveLocalEditOrigin(current.origin),
                  },
                });
              }}
            />
          </DiagramEditorSection>
          <DiagramEditorSection
            description="Methods and ports stay secondary to the visual diagram."
            title="Edit methods and ports"
          >
            <FacadeMethodsEditor
              facades={editableModel.facades}
              onSaveMethods={async (facadeId, methods) => {
                const current = editableModel.facades.find(
                  (entity) => entity.id === facadeId
                );
                if (!current) {
                  return;
                }
                await applyDomainPatch({
                  type: "update-facade",
                  facadeId,
                  changes: { methods, origin: resolveLocalEditOrigin(current.origin) },
                });
              }}
            />
            <FacadePortsEditor
              facades={editableModel.facades}
              onSavePorts={async (facadeId, ports) => {
                const current = editableModel.facades.find(
                  (entity) => entity.id === facadeId
                );
                if (!current) {
                  return;
                }
                await applyDomainPatch({
                  type: "update-facade",
                  facadeId,
                  changes: { ports, origin: resolveLocalEditOrigin(current.origin) },
                });
              }}
            />
          </DiagramEditorSection>
          <DiagramEditorSection
            defaultOpen={editableModel.relations.length === 0}
            description="Manage facade-level dependencies without leaving the visual surface."
            title="Edit relations"
          >
            <FacadeRelationEditor
              onAddRelation={async (draft) => {
                await applyDomainPatch({
                  type: "add-facade-relation",
                  relation: draft,
                });
              }}
              onDeleteRelation={async (relationId) => {
                await applyDomainPatch({
                  type: "delete-facade-relation",
                  relationId,
                });
              }}
              onUpdateRelation={async (relationId, draft) => {
                const current = editableModel.relations.find(
                  (relation) => relation.id === relationId
                );
                if (!current) {
                  return;
                }
                await applyDomainPatch({
                  type: "update-facade-relation",
                  relationId,
                  changes: {
                    from: draft.from,
                    to: draft.to,
                    type: draft.type,
                    label: draft.label,
                    notes: draft.notes,
                    origin: resolveLocalEditOrigin(current.origin),
                  },
                });
              }}
              relations={editableModel.relations}
            />
          </DiagramEditorSection>
        </>
      ) : null}
    </DiagramStagePanelScaffold>
  );
};
