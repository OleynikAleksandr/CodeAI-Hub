import type React from "react";

export const VirtualSimulationHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Virtual Simulation Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        Шаг фиксирует 2–4 пользовательских сценария в файле
        <code> virtual-simulation.md</code>.
      </div>
      <div>
        Каждый сценарий должен описывать: актор/цель, действие, ожидаемый
        результат и критерий успеха.
      </div>
      <div>
        Итоговый артефакт:{" "}
        <code>
          .codeai-hub/&lt;workspace&gt;/virtual_simulation/virtual-simulation.md
        </code>
        .
      </div>
    </div>
  </div>
);
