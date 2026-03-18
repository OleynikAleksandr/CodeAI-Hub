import type React from "react";
import type {
  FacadeRelation,
  RelationType,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { FacadeRelationDraft } from "./facade-relation-patches";
import { RelationEditorShell } from "./relation-editor-shell";

const RELATION_TYPE_OPTIONS: readonly RelationType[] = [
  "sync-call",
  "async-event",
  "shared-data",
  "config-ref",
];

const buildDraftFromRelation = (
  relation: FacadeRelation
): FacadeRelationDraft => ({
  id: relation.id,
  from: relation.from,
  to: relation.to,
  type: relation.type,
  label: relation.label,
  notes: relation.notes,
  status: relation.status,
});

const EMPTY_DRAFT: FacadeRelationDraft = {
  id: "",
  from: "",
  to: "",
  type: "sync-call",
};

export const FacadeRelationEditor: React.FC<{
  readonly relations: readonly FacadeRelation[];
  readonly onAddRelation: (draft: FacadeRelationDraft) => Promise<void>;
  readonly onDeleteRelation: (relationId: string) => Promise<void>;
  readonly onUpdateRelation: (
    relationId: string,
    draft: FacadeRelationDraft
  ) => Promise<void>;
}> = ({ relations, onAddRelation, onDeleteRelation, onUpdateRelation }) => {
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
          <input
            placeholder="From endpoint"
            value={draft.from}
            onChange={(event) => {
              setDraft((current) => ({ ...current, from: event.target.value }));
            }}
          />
          <input
            placeholder="To endpoint"
            value={draft.to}
            onChange={(event) => {
              setDraft((current) => ({ ...current, to: event.target.value }));
            }}
          />
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
          <textarea
            placeholder="Notes"
            rows={2}
            value={draft.notes ?? ""}
            onChange={(event) => {
              setDraft((current) => ({ ...current, notes: event.target.value }));
            }}
          />
        </>
      )}
      title="Facade Relation Editing"
    />
  );
};
