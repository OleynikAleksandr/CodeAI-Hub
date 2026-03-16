import type React from "react";
import { useEffect, useState } from "react";
import type {
  FacadeRelation,
  RelationType,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { FacadeRelationDraft } from "./facade-relation-patches";

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
  const [selectedRelationId, setSelectedRelationId] = useState("");
  const [draft, setDraft] = useState<FacadeRelationDraft>(EMPTY_DRAFT);

  useEffect(() => {
    const selected = relations.find((relation) => relation.id === selectedRelationId);
    setDraft(selected ? buildDraftFromRelation(selected) : EMPTY_DRAFT);
  }, [relations, selectedRelationId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <strong>Facade Relation Editing</strong>
      <select
        value={selectedRelationId}
        onChange={(event) => {
          setSelectedRelationId(event.target.value);
        }}
      >
        <option value="">New relation</option>
        {relations.map((relation) => (
          <option key={relation.id} value={relation.id}>
            {relation.id}
          </option>
        ))}
      </select>
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            void (selectedRelationId
              ? onUpdateRelation(selectedRelationId, draft)
              : onAddRelation(draft));
          }}
        >
          {selectedRelationId ? "Update relation" : "Add relation"}
        </button>
        <button
          type="button"
          disabled={!selectedRelationId}
          onClick={() => {
            if (!selectedRelationId) {
              return;
            }
            void onDeleteRelation(selectedRelationId);
            setSelectedRelationId("");
          }}
        >
          Delete relation
        </button>
      </div>
    </div>
  );
};
