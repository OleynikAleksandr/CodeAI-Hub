import type React from "react";
import { useEffect, useState } from "react";
import type {
  ModuleEntity,
  ModuleKind,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { ModuleDraft } from "./module-domain-patches";

const MODULE_KIND_OPTIONS: readonly ModuleKind[] = [
  "service",
  "library",
  "adapter",
  "gateway",
  "store",
  "external",
];

const parseList = (value: string): readonly string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const buildDraftFromEntity = (entity: ModuleEntity): ModuleDraft => ({
  id: entity.id,
  kind: entity.kind,
  title: entity.title,
  responsibility: entity.responsibility,
  cluster: entity.cluster,
  inputs: entity.inputs,
  outputs: entity.outputs,
  specTarget: entity.specTarget,
  contractTargets: entity.contractTargets,
  codeTargets: entity.codeTargets,
  notes: entity.notes,
  rationale: entity.rationale,
  status: entity.status,
});

const EMPTY_DRAFT: ModuleDraft = {
  id: "",
  kind: "service",
  title: "",
  responsibility: "",
  inputs: [],
  outputs: [],
  contractTargets: [],
  codeTargets: [],
};

export const ModuleEntityEditor: React.FC<{
  readonly modules: readonly ModuleEntity[];
  readonly onAddModule: (draft: ModuleDraft) => Promise<void>;
  readonly onDeleteModule: (moduleId: string) => Promise<void>;
  readonly onUpdateModule: (
    moduleId: string,
    draft: ModuleDraft
  ) => Promise<void>;
}> = ({ modules, onAddModule, onDeleteModule, onUpdateModule }) => {
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [draft, setDraft] = useState<ModuleDraft>(EMPTY_DRAFT);

  useEffect(() => {
    const selected = modules.find((entity) => entity.id === selectedModuleId);
    setDraft(selected ? buildDraftFromEntity(selected) : EMPTY_DRAFT);
  }, [modules, selectedModuleId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <strong>Module Editing</strong>
      <select
        value={selectedModuleId}
        onChange={(event) => {
          setSelectedModuleId(event.target.value);
        }}
      >
        <option value="">New module</option>
        {modules.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.id}
          </option>
        ))}
      </select>
      <input
        placeholder="Id"
        value={draft.id}
        onChange={(event) => {
          setDraft((current) => ({ ...current, id: event.target.value }));
        }}
      />
      <input
        placeholder="Title"
        value={draft.title}
        onChange={(event) => {
          setDraft((current) => ({ ...current, title: event.target.value }));
        }}
      />
      <select
        value={draft.kind}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            kind: event.target.value as ModuleKind,
          }));
        }}
      >
        {MODULE_KIND_OPTIONS.map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
      <textarea
        placeholder="Responsibility"
        rows={3}
        value={draft.responsibility}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            responsibility: event.target.value,
          }));
        }}
      />
      <input
        placeholder="Cluster"
        value={draft.cluster ?? ""}
        onChange={(event) => {
          setDraft((current) => ({ ...current, cluster: event.target.value }));
        }}
      />
      <input
        placeholder="Inputs (comma separated)"
        value={draft.inputs.join(", ")}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            inputs: parseList(event.target.value),
          }));
        }}
      />
      <input
        placeholder="Outputs (comma separated)"
        value={draft.outputs.join(", ")}
        onChange={(event) => {
          setDraft((current) => ({
            ...current,
            outputs: parseList(event.target.value),
          }));
        }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            void (selectedModuleId
              ? onUpdateModule(selectedModuleId, draft)
              : onAddModule(draft));
          }}
        >
          {selectedModuleId ? "Update module" : "Add module"}
        </button>
        <button
          type="button"
          disabled={!selectedModuleId}
          onClick={() => {
            if (!selectedModuleId) {
              return;
            }
            void onDeleteModule(selectedModuleId);
            setSelectedModuleId("");
          }}
        >
          Delete module
        </button>
      </div>
    </div>
  );
};
