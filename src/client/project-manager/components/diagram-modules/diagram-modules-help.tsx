import type React from "react";

export const DiagramModulesHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Diagram Modules Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        Шаг выделяет модули системы и связи между ними на основе
        <code> virtual-simulation.md</code>.
      </div>
      <div>
        Диаграмма должна показывать зоны ответственности, зависимости и
        минимально необходимые интеграции между модулями.
      </div>
      <div>
        Canonical artifact шага теперь хранится в Markdown DSL, а не в Mermaid.
      </div>
      <div>
        Итоговый артефакт:{" "}
        <code>
          .codeai-hub/&lt;workspace&gt;/diagram_modules/module-map.md
        </code>
        .
      </div>
    </div>
  </div>
);
