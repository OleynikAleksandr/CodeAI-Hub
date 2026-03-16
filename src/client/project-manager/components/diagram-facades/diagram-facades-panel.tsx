import type React from "react";
import { useCallback, useEffect } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { WorkflowStepStartService } from "../../services/workflow-step-start-service";
import { domainModelToReactFlow } from "../diagram-editor/adapters/domain-model-to-react-flow";
import { applyFacadeDomainPatch } from "../diagram-editor/apply-facade-domain-patch";
import { applyFacadeRelationPatch } from "../diagram-editor/apply-facade-relation-patch";
import { DiagramEditorShell } from "../diagram-editor/diagram-editor-shell";
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
import { StageArtifactFixButton } from "../shared/stage-artifact-fix-button";
import {
  StageArtifactPendingLayout,
} from "../shared/stage-artifact-stage-panel";

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

  if (status === "loading") {
    return <div className="pm-placeholder">Загружаем Diagram Facades…</div>;
  }

  if (status === "error") {
    return (
      <div className="pm-details">
        <div style={{ display: "grid", gap: 12 }}>
          <div className="pm-placeholder">
            {error ?? "Не удалось загрузить Diagram Facades."}
          </div>
          <StageArtifactFixButton
            onStart={handleFixStart}
            workspacePath={props.workspacePath}
            workspaceSlug={props.workspaceSlug}
          />
          {content ? (
            <div style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
              Артефакт загружен, но не прошёл parse/validation check:
              <code style={{ marginLeft: 6 }}>facade-map.md</code>
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
          <strong>Diagram Facades</strong>
          <span style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
            <code>facade-map.md</code> рендерится в semantic visual shell;
            layout сохраняется в <code>facade-map.flow.json</code>.
          </span>
        </div>
        <FacadeEntityEditor
          facades={editableModel.facades}
          onAddFacade={async (draft) => {
            await applyDomainPatch({
              type: "add-facade",
              facade: draft,
            });
          }}
          onDeleteFacade={async (facadeId) => {
            await applyDomainPatch({
              type: "delete-facade",
              facadeId,
            });
          }}
          onUpdateFacade={async (facadeId, draft) => {
            const current = editableModel.facades.find((entity) => entity.id === facadeId);
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
        <FacadeMethodsEditor
          facades={editableModel.facades}
          onSaveMethods={async (facadeId, methods) => {
            const current = editableModel.facades.find((entity) => entity.id === facadeId);
            if (!current) {
              return;
            }
            await applyDomainPatch({
              type: "update-facade",
              facadeId,
              changes: {
                methods,
                origin: resolveLocalEditOrigin(current.origin),
              },
            });
          }}
        />
        <FacadePortsEditor
          facades={editableModel.facades}
          onSavePorts={async (facadeId, ports) => {
            const current = editableModel.facades.find((entity) => entity.id === facadeId);
            if (!current) {
              return;
            }
            await applyDomainPatch({
              type: "update-facade",
              facadeId,
              changes: {
                ports,
                origin: resolveLocalEditOrigin(current.origin),
              },
            });
          }}
        />
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
          title="Diagram Facades"
        />
      </div>
    );
  }

  return (
    <StageArtifactPendingLayout
      artifactPath={artifactPath}
      title="Diagram Facades"
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Здесь отображается canonical facade map: фасады модулей, типы взаимодействий и зависимости между ними в Markdown DSL.
        </div>
        <div>
          После появления <code>facade-map.md</code> панель автоматически переключится на visual shell и создаст sidecar <code>facade-map.flow.json</code> для layout.
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
