import type { SessionMessage } from "../../../../types/session";

type DialogPanelProps = {
  readonly messages: readonly SessionMessage[];
};

const roleLabel: Record<SessionMessage["role"], string> = {
  system: "System",
  assistant: "Assistant",
  user: "You",
};

const DialogPanel = ({ messages }: DialogPanelProps) => {
  if (messages.length === 0) {
    return (
      <div className="session-dialog session-panel">
        <p className="session-dialog__empty">No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="session-dialog session-panel">
      <div className="session-dialog__scroll">
        {messages.map((message) => (
          <article
            className={`session-dialog__message session-dialog__message--${message.role}`}
            key={message.id}
          >
            <header className="session-dialog__message-header">
              <span className="session-dialog__role">
                {roleLabel[message.role]}
              </span>
              <time
                className="session-dialog__timestamp"
                dateTime={new Date(message.createdAt).toISOString()}
              >
                {new Date(message.createdAt).toLocaleTimeString()}
              </time>
            </header>
            <p className="session-dialog__content">{message.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default DialogPanel;
