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
          На шаге Description вы описываете продукт простыми словами, а агент
          переводит это в понятное описание продукта и его начальную
          архитектурную картину.
        </div>
        <div>
          Что полезнее всего заполнить в анкете:
          <ul style={{ marginTop: 6 }}>
            <li>какую проблему решает продукт и зачем он нужен;</li>
            <li>кто будет им пользоваться;</li>
            <li>2–4 ключевых сценария использования;</li>
            <li>какой это тип приложения;</li>
            <li>какие крупные части системы уже видны;</li>
            <li>ограничения, допущения и out of scope.</li>
          </ul>
        </div>
        <div>
          Короткий словарь:
          <ul style={{ marginTop: 6 }}>
            <li>
              <code>Shell</code> — то, через что пользователь запускает или
              открывает продукт.
            </li>
            <li>
              <code>Самостоятельная часть продукта</code> — часть системы,
              которая живёт отдельно.
            </li>
            <li>
              <code>Cluster</code> — крупный блок из нескольких модулей.
            </li>
            <li>
              <code>Module</code> — отдельный рабочий блок с одной понятной
              ролью.
            </li>
            <li>
              <code>Boundary</code> — граница между блоками системы.
            </li>
          </ul>
        </div>
        {isPreSubmit ? (
          <div>
            Когда анкета готова, нажмите <code>Submit questionnaire</code>.
            Агент сразу создаст <code>Final_Description.md</code>, а потом
            будет задавать только недостающие вопросы.
          </div>
        ) : (
          <div>
            После submit продолжайте диалог, пока документ вас устраивает.
            Агент должен остановить вопросы, когда сочтёт документ достаточно
            сильной основой для следующего шага, но решение о переходе остаётся
            за вами.
          </div>
        )}
        <div>
          Итог шага:{" "}
          <code>.codeai-hub/&lt;workspace&gt;/description/Final_Description.md</code>.
          Этот документ должен быть одновременно понятен пользователю и служить
          базой для следующего шага.
        </div>
      </div>
    </div>
  );
};
