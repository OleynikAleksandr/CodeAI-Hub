# Глоссарий UI-блоков сессии

- Action Bar | `ActionBar` (React component) | Контейнер быстрых действий над сессиями (New/Last/UI Outside/Old) | `src/client/ui/src/components/action-bar/index.tsx` |
- Session Tabs | `SessionTabs` | Вкладки активных сессий: выбор, закрытие, отображение провайдеров | `src/client/ui/src/session/session-tabs.tsx` |
- Session Empty State | `EmptyState` | Заглушка, показывается, когда активная сессия не выбрана | `src/client/ui/src/session/empty-state.tsx` |
- Dialog Panel | `DialogPanel` | Основной поток сообщений диалога | `src/client/ui/src/session/dialog-panel.tsx` |
- Todo Panel | `TodoPanel` | Список задач текущей сессии с переключателями | `src/client/ui/src/session/todo-panel.tsx` |
- Input Panel | `InputPanel` | Поле ввода запроса с подсказкой и кнопкой отправки | `src/client/ui/src/session/input-panel.tsx` |
- Status Panel | `StatusPanel` | Состояние сессии: провайдеры, токены, соединение, обновление | `src/client/ui/src/session/status-panel.tsx` |

> Используем эти названия во всех документах и интерфейсах, чтобы сохранять единый словарь UI-сессии.
