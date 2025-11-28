import { useMemo, useState } from "react";
import type { SessionTodoItem } from "../../../../types/session";

type TodoPanelProps = {
  readonly items: readonly SessionTodoItem[];
  readonly onToggle: (id: string) => void;
};

const TodoPanel = ({ items, onToggle }: TodoPanelProps) => {
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const completedCount = useMemo(
    () => items.filter((item) => item.completed).length,
    [items]
  );

  const visibleItems = useMemo(
    () =>
      showActiveOnly ? items.filter((item) => !item.completed) : [...items],
    [items, showActiveOnly]
  );

  const handleToggleFilter = () => {
    setShowActiveOnly((previous) => !previous);
  };

  return (
    <section className="session-todos session-panel">
      <header className="session-todos__header">
        <div className="session-todos__title-group">
          <h2 className="session-todos__title">Session TODO</h2>
          <button
            aria-label={
              showActiveOnly ? "Show all tasks" : "Show only active tasks"
            }
            aria-pressed={showActiveOnly}
            className={
              showActiveOnly
                ? "session-todos__toggle session-todos__toggle--active"
                : "session-todos__toggle"
            }
            onClick={handleToggleFilter}
            type="button"
          >
            <span aria-hidden className="session-todos__toggle-icon">
              ▾
            </span>
          </button>
        </div>
        <span className="session-todos__counter">
          {completedCount}/{items.length} done
        </span>
      </header>
      <ul className="session-todos__list">
        {visibleItems.length === 0 ? (
          <li className="session-todos__empty">All tasks complete</li>
        ) : (
          visibleItems.map((item) => {
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
          })
        )}
      </ul>
    </section>
  );
};

export default TodoPanel;
