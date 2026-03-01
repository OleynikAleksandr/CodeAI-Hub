import type React from "react";

interface DescriptionStepHelpProps {
  readonly mode: "pre_submit" | "post_submit";
}

export const DescriptionStepHelp: React.FC<DescriptionStepHelpProps> = ({
  mode,
}) => {
  const isPreSubmit = mode === "pre_submit";
  return (
    <div className="pm-details">
      <div style={{ marginBottom: 12 }}>
        <strong>Description Help</strong>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          Шаг Description фиксирует основу продукта: что вы делаете, для кого, и
          какие ключевые сценарии хотите получить в первом приближении.
        </div>
        <div>
          Минимум, который стоит закрыть в анкете:
          <ul style={{ marginTop: 6 }}>
            <li>какую проблему решает продукт;</li>
            <li>кто целевой пользователь;</li>
            <li>2–4 ключевых сценария использования;</li>
            <li>ограничения, допущения и явный out of scope.</li>
          </ul>
        </div>
        {isPreSubmit ? (
          <div>
            Когда анкета готова, нажмите <code>Submit questionnaire</code>.
            После этого запустится Description Agent и вы сможете довести
            результат до <code>Final_Description.md</code> в живом диалоге.
          </div>
        ) : (
          <div>
            После submit можно переключаться между артефактами и Help. В любой
            момент продолжайте диалог с агентом и уточняйте документ до финального
            утверждения.
          </div>
        )}
        <div>
          Итог шага: <code>.codeai-hub/&lt;workspace&gt;/description/Final_Description.md</code>.
          Дальше этот файл станет upstream-источником для Virtual Simulation.
        </div>
      </div>
    </div>
  );
};
