import type React from "react";
import { useCallback, useEffect } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { domainModelToReactFlow } from "../diagram-editor/adapters/domain-model-to-react-flow";
import { applyModuleDomainPatch } from "../diagram-editor/apply-module-domain-patch";
import { applyModuleRelationPatch } from "../diagram-editor/apply-module-relation-patch";
import { DiagramEditorShell } from "../diagram-editor/diagram-editor-shell";
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
import { StageArtifactFixButton } from "../shared/stage-artifact-fix-button";
import {
  StageArtifactPendingLayout,
} from "../shared/stage-artifact-stage-panel";

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
    saveState,
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

  if (status === "loading") {
    return <div className="pm-placeholder">Загружаем Diagram Modules…</div>;
  }

  if (status === "error") {
    return (
      <div className="pm-details">
        <div style={{ display: "grid", gap: 12 }}>
          <div className="pm-placeholder">
            {error ?? "Не удалось загрузить Diagram Modules."}
          </div>
          <StageArtifactFixButton
            onStart={handleFixStart}
            workspacePath={props.workspacePath}
            workspaceSlug={props.workspaceSlug}
          />
          {content ? (
            <div style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
              Артефакт загружен, но не прошёл parse/validation check:
              <code style={{ marginLeft: 6 }}>module-map.md</code>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === "ready" && projection && editableModel) {
    const visualProjection = domainModelToReactFlow(editableModel);

    return (
      <div className="pm-details" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <strong>Diagram Modules</strong>
          <span style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
            <code>module-map.md</code> рендерится в read-only visual shell;
            layout сохраняется в <code>module-map.flow.json</code>.
          </span>
        </div>
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
        {conflicts.length > 0 ? (
          <div className="pm-placeholder" style={{ display: "grid", gap: 6 }}>
            <strong>Conflict merge warnings</strong>
            {conflicts.map((message) => (
              <div key={message}>{message}</div>
            ))}
            <button type="button" onClick={clearConflicts}>
              Dismiss warnings
            </button>
          </div>
        ) : null}
        <DiagramEditorShell
          initialNodes={projection.nodes}
          onNodesChange={async (nodes) => {
            await persistNodes({ nodes, revision: visualProjection.revision });
          }}
          projection={visualProjection}
          saveState={saveState}
          subtitle={`${artifactPath} -> ${flowSidecarPath}`}
          title="Diagram Modules"
        />
      </div>
    );
  }

  return (
    <StageArtifactPendingLayout
      artifactPath={artifactPath}
      title="Diagram Modules"
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Здесь отображается canonical module map: какие модули существуют, как они сгруппированы и какие связи между ними зафиксированы в Markdown DSL.
        </div>
        <div>
          После появления <code>module-map.md</code> панель автоматически переключится на visual shell и создаст sidecar <code>module-map.flow.json</code> для layout.
        </div>
        <div>Любые изменения пометят следующие шаги как требующие синхронизации.</div>
        <StageArtifactFixButton
          onStart={handleFixStart}
          workspacePath={props.workspacePath}
          workspaceSlug={props.workspaceSlug}
        />
      </div>
    </StageArtifactPendingLayout>
  );
};
