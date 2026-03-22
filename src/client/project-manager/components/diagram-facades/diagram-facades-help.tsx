import type React from "react";

export const DiagramFacadesHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Diagram Facades Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        На шаге Diagram Facades агент превращает согласованный{" "}
        <code>module-inventory.md</code> в каноническую карту внешних точек
        входа модулей и значимых контрактов между ними. Итоговый{" "}
        <code>facade-map.md</code> должен быть одновременно понятен
        пользователю и служить следующему шагу как boundary map, а не как
        описание внутренней реализации.
      </div>
      <div>
        Главное правило шага: semantic source of truth для состава системы уже
        зафиксирован в <code>module-inventory.md</code>. Здесь агент не должен
        придумывать новые модули, product parts или clusters, а должен
        перевести уже согласованные module boundaries в facade map.
      </div>
      <div>
        Что полезнее всего уточнять в диалоге:
        <ul style={{ marginTop: 6 }}>
          <li>какой внешний вход действительно нужен каждому важному модулю;</li>
          <li>какие взаимодействия между фасадами реально важны для понимания;</li>
          <li>где нужен sync-call, async-event, shared-data или config-ref;</li>
          <li>какие границы нельзя пересекать напрямую.</li>
        </ul>
      </div>
      <div>
        Короткий словарь:
        <ul style={{ marginTop: 6 }}>
          <li>
            <code>Facade</code> — единая внешняя точка входа в модуль.
          </li>
          <li>
            <code>Facade Relation</code> — значимое взаимодействие между двумя
            facade IDs.
          </li>
          <li>
            <code>Methods</code> и <code>Ports</code> должны оставаться
            user-readable и не превращаться в low-level API specification.
          </li>
        </ul>
      </div>
      <div>
        Артефакт должен быть согласован с <code>module-inventory.md</code> и
        не дублировать внутренние классы, hooks, stores или другие детали
        реализации. Здесь фиксируются только внешние точки входа и связи между
        ними.
      </div>
      <div>
        Итог шага:{" "}
        <code>
          .codeai-hub/&lt;workspace&gt;/diagram_facades/facade-map.md
        </code>
        .
      </div>
    </div>
  </div>
);
