import type React from "react";
import { useEffect, useState } from "react";
import type { FacadeEntity } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

const parseLines = (value: string): readonly string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const FacadeMethodsEditor: React.FC<{
  readonly facades: readonly FacadeEntity[];
  readonly onSaveMethods: (
    facadeId: string,
    methods: readonly string[]
  ) => Promise<void>;
}> = ({ facades, onSaveMethods }) => {
  const [selectedFacadeId, setSelectedFacadeId] = useState("");
  const [methodsText, setMethodsText] = useState("");

  useEffect(() => {
    const selected = facades.find((entity) => entity.id === selectedFacadeId);
    setMethodsText(selected ? selected.methods.join("\n") : "");
  }, [facades, selectedFacadeId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <strong>Methods Editing</strong>
      <select
        value={selectedFacadeId}
        onChange={(event) => {
          setSelectedFacadeId(event.target.value);
        }}
      >
        <option value="">Select facade</option>
        {facades.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.id}
          </option>
        ))}
      </select>
      <textarea
        placeholder="One method signature per line"
        rows={5}
        value={methodsText}
        onChange={(event) => {
          setMethodsText(event.target.value);
        }}
      />
      <button
        type="button"
        disabled={!selectedFacadeId}
        onClick={() => {
          if (!selectedFacadeId) {
            return;
          }
          void onSaveMethods(selectedFacadeId, parseLines(methodsText));
        }}
      >
        Save methods
      </button>
    </div>
  );
};
