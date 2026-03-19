import type React from "react";

export const DiagramFacadesHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Diagram Facades Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        Шаг фиксирует фасады модулей и контракты взаимодействия между ними.
      </div>
      <div>
        Артефакт должен быть согласован с
        <code>module-inventory.md</code> и не дублировать внутренние детали
        реализации.
      </div>
      <div>
        Итоговый артефакт:{" "}
        <code>
          .codeai-hub/&lt;workspace&gt;/diagram_facades/facade-map.md
        </code>
        .
      </div>
    </div>
  </div>
);
