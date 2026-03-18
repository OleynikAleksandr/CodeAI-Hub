import type React from "react";
import type {
  Criticality,
  ModuleEntity,
  ModuleRelation,
  RelationType,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { ModuleRelationDraft } from "./module-relation-patches";
import { RelationEditorShell } from "./relation-editor-shell";

const RELATION_TYPE_OPTIONS: readonly RelationType[] = [
  "sync-call",
  "async-event",
  "shared-data",
  "config-ref",
];

const CRITICALITY_OPTIONS: readonly (Criticality | "")[] = [
  "",
  "high",
  "medium",
  "low",
];

const buildDraftFromRelation = (
  relation: ModuleRelation
): ModuleRelationDraft => ({
  id: relation.id,
  from: relation.from,
  to: relation.to,
  type: relation.type,
  label: relation.label,
  criticality: relation.criticality,
  notes: relation.notes,
  status: relation.status,
});

const EMPTY_DRAFT: ModuleRelationDraft = {
  id: "",
  from: "",
  to: "",
  type: "sync-call",
};

export const ModuleRelationEditor: React.FC<{
  readonly modules: readonly ModuleEntity[];
  readonly relations: readonly ModuleRelation[];
  readonly onAddRelation: (draft: ModuleRelationDraft) => Promise<void>;
  readonly onDeleteRelation: (relationId: string) => Promise<void>;
  readonly onUpdateRelation: (
    relationId: string,
    draft: ModuleRelationDraft
  ) => Promise<void>;
}> = ({ modules, relations, onAddRelation, onDeleteRelation, onUpdateRelation }) => {
  return (
    <RelationEditorShell
      buildDraftFromRelation={buildDraftFromRelation}
      emptyDraft={EMPTY_DRAFT}
      onAddRelation={onAddRelation}
      onDeleteRelation={onDeleteRelation}
      onUpdateRelation={onUpdateRelation}
      relations={relations}
      renderFields={({ draft, setDraft }) => (
        <>
          <input
            placeholder="Relation Id"
            value={draft.id}
            onChange={(event) => {
              setDraft((current) => ({ ...current, id: event.target.value }));
            }}
          />
          <select
            value={draft.from}
            onChange={(event) => {
              setDraft((current) => ({ ...current, from: event.target.value }));
            }}
          >
            <option value="">From module</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.id}
              </option>
            ))}
          </select>
          <select
            value={draft.to}
            onChange={(event) => {
              setDraft((current) => ({ ...current, to: event.target.value }));
            }}
          >
            <option value="">To module</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.id}
              </option>
            ))}
          </select>
          <select
            value={draft.type}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                type: event.target.value as RelationType,
              }));
            }}
          >
            {RELATION_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            placeholder="Label"
            value={draft.label ?? ""}
            onChange={(event) => {
              setDraft((current) => ({ ...current, label: event.target.value }));
            }}
          />
          <select
            value={draft.criticality ?? ""}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                criticality: (event.target.value || undefined) as
                  | Criticality
                  | undefined,
              }));
            }}
          >
            {CRITICALITY_OPTIONS.map((level) => (
              <option key={level || "none"} value={level}>
                {level || "No criticality"}
              </option>
            ))}
          </select>
        </>
      )}
      title="Relation Editing"
    />
  );
};
