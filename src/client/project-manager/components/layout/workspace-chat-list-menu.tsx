import type React from "react";

export interface ChatMenuChat {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly title: string;
}

export type ChatMenuMode = "actions" | "delete" | "rename";

export interface ChatMenuState {
  readonly chat: ChatMenuChat;
  readonly draftTitle: string;
  readonly mode: ChatMenuMode;
  readonly x: number;
  readonly y: number;
}

export const createChatMenuState = (
  event: React.MouseEvent<HTMLElement>,
  chat: ChatMenuChat
): ChatMenuState => ({
  chat,
  draftTitle: chat.title,
  mode: "actions",
  x: event.clientX,
  y: event.clientY,
});

export const WorkspaceChatListMenu: React.FC<{
  readonly menu: ChatMenuState;
  readonly onChange: (menu: ChatMenuState) => void;
  readonly onClose: () => void;
  readonly onDelete: (chat: ChatMenuChat) => void;
  readonly onRename: (chat: ChatMenuChat, title: string) => void;
}> = ({ menu, onChange, onClose, onDelete, onRename }) => {
  const updateMode = (mode: ChatMenuMode) =>
    onChange({ ...menu, draftTitle: menu.chat.title, mode });

  const content =
    menu.mode === "rename" ? (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRename(menu.chat, menu.draftTitle.trim());
        }}
      >
        <div className="pm-tree-menu__text">Rename chat</div>
        <input
          autoFocus
          className="pm-tree-menu__input"
          onChange={(event) =>
            onChange({ ...menu, draftTitle: event.currentTarget.value })
          }
          value={menu.draftTitle}
        />
        <div className="pm-tree-menu__actions">
          <button
            className="pm-tree-menu__btn pm-tree-menu__btn--secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button className="pm-tree-menu__btn pm-tree-menu__btn--danger" type="submit">
            Rename
          </button>
        </div>
      </form>
    ) : menu.mode === "delete" ? (
      <>
        <div className="pm-tree-menu__text">Delete "{menu.chat.title}"?</div>
        <div className="pm-tree-menu__warning">This cannot be undone.</div>
        <div className="pm-tree-menu__actions">
          <button
            className="pm-tree-menu__btn pm-tree-menu__btn--secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="pm-tree-menu__btn pm-tree-menu__btn--danger"
            onClick={() => onDelete(menu.chat)}
            type="button"
          >
            Delete
          </button>
        </div>
      </>
    ) : (
      <>
        <button
          className="pm-tree-menu__item"
          onClick={() => updateMode("rename")}
          role="menuitem"
          type="button"
        >
          Rename
        </button>
        <button
          className="pm-tree-menu__item"
          onClick={() => updateMode("delete")}
          role="menuitem"
          type="button"
        >
          Delete
        </button>
      </>
    );

  return (
    <div
      aria-label="Chat menu"
      aria-modal={menu.mode === "actions" ? undefined : "true"}
      className={menu.mode === "actions" ? "pm-tree-menu" : "pm-tree-menu__dialog"}
      onClick={(event) => event.stopPropagation()}
      role={menu.mode === "actions" ? "menu" : "dialog"}
      style={{ left: menu.x, top: menu.y }}
    >
      {content}
    </div>
  );
};
