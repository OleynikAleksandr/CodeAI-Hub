import type React from "react";
import { useEffect, useState } from "react";

type RelationDraftBase = {
  readonly id: string;
};

type RelationEditorShellProps<
  TRelation extends RelationDraftBase,
  TDraft extends RelationDraftBase,
> = {
  readonly buildDraftFromRelation: (relation: TRelation) => TDraft;
  readonly emptyDraft: TDraft;
  readonly onAddRelation: (draft: TDraft) => Promise<void>;
  readonly onDeleteRelation: (relationId: string) => Promise<void>;
  readonly onUpdateRelation: (relationId: string, draft: TDraft) => Promise<void>;
  readonly relations: readonly TRelation[];
  readonly renderFields: (props: {
    readonly draft: TDraft;
    readonly setDraft: React.Dispatch<React.SetStateAction<TDraft>>;
  }) => React.ReactNode;
  readonly title: string;
};

export const RelationEditorShell = <
  TRelation extends RelationDraftBase,
  TDraft extends RelationDraftBase,
>({
  buildDraftFromRelation,
  emptyDraft,
  onAddRelation,
  onDeleteRelation,
  onUpdateRelation,
  relations,
  renderFields,
  title,
}: RelationEditorShellProps<TRelation, TDraft>) => {
  const [selectedRelationId, setSelectedRelationId] = useState("");
  const [draft, setDraft] = useState<TDraft>(emptyDraft);

  useEffect(() => {
    const selected = relations.find((relation) => relation.id === selectedRelationId);
    setDraft(selected ? buildDraftFromRelation(selected) : emptyDraft);
  }, [buildDraftFromRelation, emptyDraft, relations, selectedRelationId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <strong>{title}</strong>
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
      {renderFields({ draft, setDraft })}
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
