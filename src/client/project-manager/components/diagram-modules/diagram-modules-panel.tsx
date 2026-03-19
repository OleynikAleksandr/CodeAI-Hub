import type React from "react";
import { useCallback, useEffect } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { domainModelToReactFlow } from "../diagram-editor/adapters/domain-model-to-react-flow";
import { applyModuleDomainPatch } from "../diagram-editor/apply-module-domain-patch";
import { applyModuleRelationPatch } from "../diagram-editor/apply-module-relation-patch";
import { DiagramEditorSection } from "../diagram-editor/diagram-editor-section";
import { DiagramStagePanelScaffold } from "../diagram-editor/diagram-stage-panel-scaffold";
import {
  mergeModuleConflicts,
  type ModuleSemanticPatch,
} from "../diagram-editor/module-conflict-merge";
import { ModuleEntityEditor } from "../diagram-editor/module-entity-editor";
import type { ModuleDomainPatch } from "../diagram-editor/module-domain-patches";
import { resolveLocalEditOrigin } from "../diagram-editor/module-origin-rules";
import { ModuleRelationEditor } from "../diagram-editor/module-relation-editor";
import { useDomainPatch } from "../diagram-editor/use-domain-patch";
import { useDiagramLoader } from "../diagram-editor/use-diagram-loader";
import { useDiagramPersistence } from "../diagram-editor/use-diagram-persistence";

const startService = new WorkflowStepStartService();

export const DiagramModulesPanel: React.FC<{
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
  } =
    useDiagramLoader({
      refreshKey: props.refreshKey,
      stage: "diagram_modules",
      workspacePath: props.workspacePath,
      workspaceSlug: props.workspaceSlug,
    });
  const {
    persistNodes,
    persistModel,
    markConflict,
    clearConflict,
  } = useDiagramPersistence({
    artifactPath,
    flowSidecarPath,
    stage: "diagram_modules",
    workspacePath: props.workspacePath,
    workspaceSlug: props.workspaceSlug,
  });
  const {
    model: editableModel,
    conflicts,
    applyDomainPatch,
    clearConflicts,
  } = useDomainPatch<
    Extract<typeof model, { readonly stage: "diagram_modules" }>,
    ModuleSemanticPatch
  >({
    baseModel: model?.stage === "diagram_modules" ? model : null,
    applyPatch: (currentModel, patch) =>
      patch.type === "add-module" ||
      patch.type === "update-module" ||
      patch.type === "delete-module"
        ? applyModuleDomainPatch(currentModel, patch as ModuleDomainPatch)
        : applyModuleRelationPatch(currentModel, patch),
    mergeIncoming: (incoming, patches) => mergeModuleConflicts({ incoming, patches }),
    persistModel,
  });

  const handleFixStart = useCallback(
    async (p: {
      readonly workspacePath: string;
      readonly workspaceSlug: string;
      readonly providerId: string;
    }): Promise<void> => {
      await startService.startDiagramModules({
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
      artifactFileName="module-map.md"
      artifactPath={artifactPath}
      conflicts={conflicts}
      content={content}
      error={error}
      initialNodes={projection?.nodes}
      introText="Artifacts shows the visual module map. Use Source for the canonical Markdown artifact."
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
            Здесь отображается visual module diagram. Canonical Markdown source
            доступен через вкладку <code>Source</code>.
          </div>
          <div>
            После появления <code>module-map.md</code> панель автоматически
            откроет diagram-first surface.
          </div>
          <div>
            Любые изменения пометят следующие шаги как требующие синхронизации.
          </div>
        </div>
      }
      projection={visualProjection}
      status={status}
      title="Diagram Modules"
      workspacePath={props.workspacePath}
      workspaceSlug={props.workspaceSlug}
    >
      {editableModel ? (
        <>
          <DiagramEditorSection
            defaultOpen={editableModel.modules.length === 0}
            description="Add, update, or remove modules after reviewing the diagram."
            title="Edit modules"
          >
            <ModuleEntityEditor
              modules={editableModel.modules}
              onAddModule={async (draft) => {
                await applyDomainPatch({
                  type: "add-module",
                  module: draft,
                });
              }}
              onDeleteModule={async (moduleId) => {
                await applyDomainPatch({
                  type: "delete-module",
                  moduleId,
                });
              }}
              onUpdateModule={async (moduleId, draft) => {
                const current = editableModel.modules.find(
                  (entity) => entity.id === moduleId
                );
                if (!current) {
                  return;
                }
                await applyDomainPatch({
                  type: "update-module",
                  moduleId,
                  changes: {
                    kind: draft.kind,
                    title: draft.title,
                    responsibility: draft.responsibility,
                    cluster: draft.cluster,
                    inputs: draft.inputs,
                    outputs: draft.outputs,
                    specTarget: draft.specTarget,
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
            defaultOpen={editableModel.relations.length === 0}
            description="Manage module dependencies without leaving the visual surface."
            title="Edit relations"
          >
            <ModuleRelationEditor
              modules={editableModel.modules}
              onAddRelation={async (draft) => {
                await applyDomainPatch({
                  type: "add-relation",
                  relation: draft,
                });
              }}
              onDeleteRelation={async (relationId) => {
                await applyDomainPatch({
                  type: "delete-relation",
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
                  type: "update-relation",
                  relationId,
                  changes: {
                    from: draft.from,
                    to: draft.to,
                    type: draft.type,
                    label: draft.label,
                    criticality: draft.criticality,
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
