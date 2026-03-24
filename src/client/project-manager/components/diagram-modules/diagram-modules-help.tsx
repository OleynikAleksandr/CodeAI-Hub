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
        в канонический состав системы. Теперь шаг начинается не с одного giant
        inventory-файла, а с <code>product-parts.index.md</code> и затем
        последовательно materialize-ит отдельные{" "}
        <code>product-parts/&lt;part-id&gt;.md</code>.
      </div>
      <div>
        Главное правило шага: сначала согласуется смысловая карта системы, а
        уже потом runtime progressively строит из неё диаграмму. Пользователь
        должен видеть, как Product Parts появляются по очереди, не дожидаясь
        полного завершения всего шага.
      </div>
      <div>
        Базовый semantic source of truth теперь двухслойный:{" "}
        <code>product-parts.index.md</code> задаёт порядок и общий контур, а
        part-файлы уточняют реальное содержание каждого Product Part.{" "}
        Part-файлы — финальный артефакт этого шага.
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
            <code>Product Part</code> — верхнеуровневая часть продукта,
            которая может жить, запускаться или поставляться отдельно.
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
        задаёт staged contract для index и part-файлов, смысл полей уточняет{" "}
        <code>module-inventory-field-reference.md</code>, а правила merge и
        compatibility aggregate описаны в{" "}
        <code>module-inventory-merge-rules.md</code>.
      </div>
      <div>
        <code>module-map.flow.json</code> не описывает архитектуру. Этот файл
        хранит только layout и может обновляться по мере progressive
        regeneration графа или после ручного перетаскивания карточек.
      </div>
      <div>
        Агент должен задавать только недостающие вопросы и остановить
        уточнения, когда сочтёт inventory достаточно сильной основой для
        продолжения. Решение о переходе всё равно остаётся за вами.
      </div>
    </div>
  </div>
);
