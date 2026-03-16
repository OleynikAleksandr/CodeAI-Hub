import type React from "react";
import { useEffect, useState } from "react";
import type {
  FacadeEntity,
  FacadeVisibility,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { FacadeDraft } from "./facade-domain-patches";

const VISIBILITY_OPTIONS: readonly FacadeVisibility[] = ["public", "internal"];

const parseList = (value: string): readonly string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const buildDraftFromEntity = (entity: FacadeEntity): FacadeDraft => ({
  id: entity.id,
  module: entity.module,
  kind: "class",
  visibility: entity.visibility,
  methods: entity.methods,
  ports: entity.ports,
  contractTargets: entity.contractTargets,
  codeTargets: entity.codeTargets,
  notes: entity.notes,
  rationale: entity.rationale,
  status: entity.status,
});

const EMPTY_DRAFT: FacadeDraft = {
  id: "",
  module: "",
  kind: "class",
  visibility: "public",
  methods: [],
  ports: [],
  contractTargets: [],
  codeTargets: [],
};

export const FacadeEntityEditor: React.FC<{
  readonly facades: readonly FacadeEntity[];
  readonly onAddFacade: (draft: FacadeDraft) => Promise<void>;
  readonly onDeleteFacade: (facadeId: string) => Promise<void>;
  readonly onUpdateFacade: (
    facadeId: string,
    draft: FacadeDraft
  ) => Promise<void>;
}> = ({ facades, onAddFacade, onDeleteFacade, onUpdateFacade }) => {
  const [selectedFacadeId, setSelectedFacadeId] = useState("");
  const [draft, setDraft] = useState<FacadeDraft>(EMPTY_DRAFT);

  useEffect(() => {
    const selected = facades.find((entity) => entity.id === selectedFacadeId);
    setDraft(selected ? buildDraftFromEntity(selected) : EMPTY_DRAFT);
  }, [facades, selectedFacadeId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <strong>Facade Editing</strong>
      <select
        value={selectedFacadeId}
        onChange={(event) => {
          setSelectedFacadeId(event.target.value);
        }}
      >
        <option value="">New facade</option>
        {facades.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.id}
          </option>
        ))}
      </select>
      <input
        placeholder="Facade Id"
        value={draft.id}
        onChange={(event) => {
          setDraft((current) => ({ ...current, id: event.target.value }));
        }}
      />
      <input
        placeholder="Module"
        value={draft.module}
        onChange={(event) => {
          setDraft((current) => ({ ...current, module: event.target.value }));
        }}
      />
      <select
        value={draft.visibility}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            visibility: event.target.value as FacadeVisibility,
          }));
        }}
      >
        {VISIBILITY_OPTIONS.map((visibility) => (
          <option key={visibility} value={visibility}>
            {visibility}
          </option>
        ))}
      </select>
      <input
        placeholder="Contract Targets (comma separated)"
        value={draft.contractTargets.join(", ")}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            contractTargets: parseList(event.target.value),
          }));
        }}
      />
      <input
        placeholder="Code Targets (comma separated)"
        value={draft.codeTargets.join(", ")}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            codeTargets: parseList(event.target.value),
          }));
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
      <textarea
        placeholder="Rationale"
        rows={2}
        value={draft.rationale ?? ""}
        onChange={(event) => {
          setDraft((current) => ({ ...current, rationale: event.target.value }));
        }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            void (selectedFacadeId
              ? onUpdateFacade(selectedFacadeId, draft)
              : onAddFacade(draft));
          }}
        >
          {selectedFacadeId ? "Update facade" : "Add facade"}
        </button>
        <button
          type="button"
          disabled={!selectedFacadeId}
          onClick={() => {
            if (!selectedFacadeId) {
              return;
            }
            void onDeleteFacade(selectedFacadeId);
            setSelectedFacadeId("");
          }}
        >
          Delete facade
        </button>
      </div>
    </div>
  );
};
