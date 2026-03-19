import type React from "react";

export const DiagramModulesHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Diagram Modules Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        Шаг строит человекочитаемый перечень модулей и кластеров на основе
        <code> Final_Description.md</code> и <code> virtual-simulation.md</code>.
      </div>
      <div>
        Сначала согласуется <code>module-inventory.md</code>: кластеры, их
        состав, отдельные модули и простые связи между ними.
      </div>
      <div>
        После этого визуальная диаграмма строится уже из согласованного
        inventory, а не напрямую из сценариев.
      </div>
      <div>
        В панели <code>Source</code> открыт
        <code>module-inventory.md</code>, а не raw <code>module-map.md</code>.
      </div>
      <div>
        Итоговая визуализация шага:{" "}
        <code>
          .codeai-hub/&lt;workspace&gt;/diagram_modules/module-map.md
        </code>
        .
      </div>
    </div>
  </div>
);
