import type React from "react";

export const DiagramModulesHelp: React.FC = () => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>Diagram Modules Help</strong>
    </div>
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        На шаге Diagram Modules агент превращает{" "}
        <code>Final_Description.md</code> и <code>virtual-simulation.md</code>{" "}
        в канонический состав системы. Итоговый <code>module-inventory.md</code>{" "}
        должен быть одновременно понятен пользователю и служить основой для
        visual diagram и следующего шага.
      </div>
      <div>
        Главное правило шага: сначала согласуется смысловая карта системы, а
        уже потом runtime строит из неё диаграмму. Semantic source of truth
        здесь только один: <code>module-inventory.md</code>.
      </div>
      <div>
        В visual hierarchy этого шага ownership читается как{" "}
        <code>Product Part -&gt; Cluster -&gt; Module</code>.
      </div>
      <div>
        Что полезнее всего уточнять в диалоге:
        <ul style={{ marginTop: 6 }}>
          <li>какие части продукта действительно существуют;</li>
          <li>какие блоки образуют один cluster, а какие должны жить отдельно;</li>
          <li>какие простые связи между блоками реально важны для понимания;</li>
          <li>какие границы нельзя смешивать даже если DSL пока ещё плоский.</li>
        </ul>
      </div>
      <div>
        Короткий словарь:
        <ul style={{ marginTop: 6 }}>
          <li>
            <code>Shell</code> — оболочка продукта, через которую пользователь
            запускает или открывает систему.
          </li>
          <li>
            <code>Самостоятельная часть продукта</code> — часть системы,
            которая может жить отдельно.
          </li>
          <li>
            <code>Cluster</code> — крупный блок из нескольких модулей с одним
            внешним входом через facade.
          </li>
          <li>
            <code>Module</code> — отдельный рабочий блок с одной понятной
            ролью и своим facade.
          </li>
          <li>
            <code>Boundary</code> — граница между частями системы.
          </li>
        </ul>
      </div>
      <div>
        Runtime templates этого шага лежат в{" "}
        <code>.codeai-hub/templates/diagram_modules/</code>: основной каркас
        задаёт <code>module-inventory-template.md</code>, смысл полей уточняет{" "}
        <code>module-inventory-field-reference.md</code>, а правила merge
        описаны в <code>module-inventory-merge-rules.md</code>.
      </div>
      <div>
        <code>module-map.flow.json</code> не описывает архитектуру. Этот файл
        хранит только layout и обычно появляется после ручного перетаскивания
        карточек на диаграмме.
      </div>
      <div>
        Агент должен задавать только недостающие вопросы и остановить
        уточнения, когда сочтёт inventory достаточно сильной основой для
        продолжения. Решение о переходе всё равно остаётся за вами.
      </div>
    </div>
  </div>
);
