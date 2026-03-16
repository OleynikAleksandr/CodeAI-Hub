import type React from "react";
import { useEffect, useState } from "react";
import type {
  FacadeEntity,
  FacadePort,
  FacadePortDirection,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

const parsePorts = (value: string): readonly FacadePort[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const [directionPart, rest = ""] = item.split(":");
      const direction = directionPart.trim() as FacadePortDirection;
      const [typePart, preposition = "", ...targetParts] = rest.trim().split(" ");
      const target = targetParts.join(" ").trim();
      return {
        direction,
        type: typePart.trim(),
        target: preposition ? target : rest.trim(),
      };
    })
    .filter(
      (port) =>
        (port.direction === "In" || port.direction === "Out") &&
        port.type.length > 0 &&
        port.target.length > 0
    );

const formatPort = (port: FacadePort): string =>
  `${port.direction}: ${port.type} ${port.direction === "In" ? "from" : "to"} ${port.target}`;

export const FacadePortsEditor: React.FC<{
  readonly facades: readonly FacadeEntity[];
  readonly onSavePorts: (
    facadeId: string,
    ports: readonly FacadePort[]
  ) => Promise<void>;
}> = ({ facades, onSavePorts }) => {
  const [selectedFacadeId, setSelectedFacadeId] = useState("");
  const [portsText, setPortsText] = useState("");

  useEffect(() => {
    const selected = facades.find((entity) => entity.id === selectedFacadeId);
    setPortsText(selected ? selected.ports.map(formatPort).join("\n") : "");
  }, [facades, selectedFacadeId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <strong>Ports Editing</strong>
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
        placeholder="Format: In: http from api-gateway"
        rows={5}
        value={portsText}
        onChange={(event) => {
          setPortsText(event.target.value);
        }}
      />
      <button
        type="button"
        disabled={!selectedFacadeId}
        onClick={() => {
          if (!selectedFacadeId) {
            return;
          }
          void onSavePorts(selectedFacadeId, parsePorts(portsText));
        }}
      >
        Save ports
      </button>
    </div>
  );
};
