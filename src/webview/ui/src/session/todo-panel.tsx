import type { SessionTodoItem } from "../../../../types/session";

type TodoPanelProps = {
  readonly items: readonly SessionTodoItem[];
  readonly onToggle: (id: string) => void;
};

const TodoPanel = ({ items, onToggle }: TodoPanelProps) => (
  <section className="session-todos session-panel">
    <header className="session-todos__header">
      <h2 className="session-todos__title">Session TODO</h2>
      <span className="session-todos__counter">
        {items.filter((item) => item.completed).length}/{items.length} done
      </span>
    </header>
    <ul className="session-todos__list">
      {items.map((item) => {
        const textClassName = item.completed
          ? "session-todos__text session-todos__text--completed"
          : "session-todos__text";

        return (
          <li className="session-todos__item" key={item.id}>
            <label className="session-todos__label">
              <input
                checked={item.completed}
                onChange={() => onToggle(item.id)}
                type="checkbox"
              />
              <span className={textClassName}>{item.title}</span>
            </label>
          </li>
        );
      })}
    </ul>
  </section>
);

export default TodoPanel;
