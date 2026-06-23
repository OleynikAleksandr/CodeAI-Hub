import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { api } from "../../api";
import {
  openStandaloneSessionPlaceholder,
  openStandaloneSessionWindow,
  requestWorkspaceChatAction,
} from "./workspace-chat-list-actions";
import {
  createChatMenuState,
  type ChatMenuChat,
  type ChatMenuState,
  WorkspaceChatListMenu,
} from "./workspace-chat-list-menu";
import { resolveDefaultStartCardModelSelection } from "../shared/stage-start-model-selection";

const UI_LABELS_CATEGORY = "ui_interface";
const USER_MESSAGES_CATEGORY = "system_feedback";

interface StandaloneChatSummary {
  readonly lastMessagePreview: string | null;
  readonly liveSessionId: string | null;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly title: string;
  readonly updatedAt: string;
}

interface WorkspaceChatListProps {
  readonly workspacePath?: string;
  readonly workspaceSlug?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStandaloneWorkspaceEvent = (
  message: { readonly payload?: unknown },
  workspacePath: string | undefined
): boolean => {
  if (!workspacePath || !isRecord(message.payload)) {
    return false;
  }
  return (
    message.payload.workspacePath === workspacePath &&
    message.payload.stage === null &&
    message.payload.runSlug === null &&
    message.payload.initiativeSlug === null
  );
};

const waitForStandaloneSession = (params: {
  readonly providerId: ProviderStackId;
  readonly providerSessionId?: string;
  readonly workspacePath: string;
}): Promise<SessionRecord> =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now() - 2000;
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type === "session:error") {
        unsubscribe();
        reject(new Error("Unable to create chat session."));
        return;
      }
      if (message.type !== "session:created") {
        return;
      }
      const session = message.payload as SessionRecord;
      const isRequestedProviderSession =
        typeof params.providerSessionId === "string" &&
        session.binding.providerSessionId === params.providerSessionId;
      if (
        session.workspacePath !== params.workspacePath ||
        !session.providerIds.includes(params.providerId) ||
        session.stage !== null ||
        session.initiativeSlug !== null ||
        (session.createdAt < startedAt && !isRequestedProviderSession) ||
        (params.providerSessionId && !isRequestedProviderSession)
      ) {
        return;
      }
      unsubscribe();
      resolve(session);
    });
  });

const fetchWorkspaceChats = async (
  workspacePath: string
): Promise<StandaloneChatSummary[]> => {
  const httpUrl = api.getHttpUrl();
  if (!httpUrl) {
    return [];
  }
  const query = new URLSearchParams({ workspacePath });
  const response = await fetch(`${httpUrl}/api/v1/standalone-chats?${query}`);
  if (!response.ok) {
    throw new Error("Unable to load chats.");
  }
  const payload = (await response.json()) as {
    readonly chats?: readonly StandaloneChatSummary[];
  };
  return Array.isArray(payload.chats) ? [...payload.chats] : [];
};

const ProviderPicker: React.FC<{
  readonly onCancel: () => void;
  readonly onConfirm: (providerId: ProviderStackId) => void;
  readonly providers: readonly ProviderStackDescriptor[];
  readonly visible: boolean;
}> = ({ onCancel, onConfirm, providers, visible }) => {
  const { t } = useLocalization();
  const [selected, setSelected] = useState<ProviderStackId | null>(null);
  const firstOptionRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (visible) {
      setSelected(null);
      firstOptionRef.current?.focus();
    }
  }, [visible]);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selected) ?? null,
    [providers, selected]
  );

  if (!visible) {
    return null;
  }

  return (
    <div className="pm-provider-picker-overlay">
      <section
        aria-modal="true"
        className="pm-provider-picker"
        role="dialog"
      >
        <header className="pm-provider-picker__header">
          <h2 className="pm-provider-picker__title">
            {t(UI_LABELS_CATEGORY, "pm.chat.provider_picker.title", "New chat")}
          </h2>
          <p className="pm-provider-picker__description">
            {t(
              USER_MESSAGES_CATEGORY,
              "pm.chat.provider_picker.description",
              "Choose a provider for this workspace chat."
            )}
          </p>
        </header>
        <form
          className="pm-provider-picker__form"
          onSubmit={(event) => {
            event.preventDefault();
            if (selectedProvider?.connected) {
              onConfirm(selectedProvider.id);
            }
          }}
        >
          <div className="pm-provider-picker__options">
            {providers.map((provider, index) => {
              const disabled = !provider.connected;
              return (
                <label
                  aria-disabled={disabled}
                  className={
                    disabled
                      ? "pm-provider-picker__option pm-provider-picker__option--disabled"
                      : "pm-provider-picker__option"
                  }
                  key={provider.id}
                >
                  <input
                    checked={provider.id === selected}
                    className="pm-provider-picker__radio"
                    disabled={disabled}
                    name="pm-chat-provider-picker"
                    onChange={() => setSelected(provider.id)}
                    ref={index === 0 ? firstOptionRef : undefined}
                    type="radio"
                  />
                  <span className="pm-provider-picker__label">
                    <span className="pm-provider-picker__label-title">
                      {provider.title}
                    </span>
                    <span
                      className={
                        provider.connected
                          ? "pm-provider-picker__status pm-provider-picker__status--connected"
                          : "pm-provider-picker__status pm-provider-picker__status--disconnected"
                      }
                    >
                      {provider.connected ? "Available" : "Unavailable"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="pm-provider-picker__actions">
            <output aria-live="polite" className="pm-provider-picker__status-line">
              {selectedProvider
                ? `${selectedProvider.title} selected.`
                : "Choose a provider."}
            </output>
            <div className="pm-provider-picker__buttons">
              <button
                className="pm-provider-picker__button"
                onClick={onCancel}
                type="button"
              >
                Cancel
              </button>
              <button
                className="pm-provider-picker__button pm-provider-picker__button--primary"
                disabled={!selectedProvider?.connected}
                type="submit"
              >
                Start
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

export const WorkspaceChatList: React.FC<WorkspaceChatListProps> = ({
  workspacePath,
  workspaceSlug,
}) => {
  const { availableEngines, t } = useLocalization();
  const [chats, setChats] = useState<readonly StandaloneChatSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<ChatMenuState | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [providers, setProviders] = useState(api.getStandaloneChatProviders());
  const closeMenu = useCallback(() => setMenu(null), []);
  const openChatMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, chat: StandaloneChatSummary) => {
      event.preventDefault();
      event.stopPropagation();
      setMenu(createChatMenuState(event, chat));
    },
    []
  );

  const loadChats = useCallback(async (options?: { readonly silent?: boolean }) => {
    if (!workspacePath) {
      setChats([]);
      return;
    }
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      setChats(await fetchWorkspaceChats(workspacePath));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [workspacePath]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!menu) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeMenu, menu]);

  useEffect(
    () =>
      api.onCoreEvent((message) => {
        if (
          message.type === "core:state" ||
          message.type === "session:deleted" ||
          isStandaloneWorkspaceEvent(message, workspacePath)
        ) {
          setProviders(api.getStandaloneChatProviders());
          void loadChats({ silent: message.type !== "core:state" });
        }
      }),
    [loadChats, workspacePath]
  );

  const openSession = useCallback(
    async (chat: StandaloneChatSummary) => {
      if (!(workspacePath && workspaceSlug)) {
        return;
      }
      if (chat.liveSessionId) {
        openStandaloneSessionWindow({
          sessionId: chat.liveSessionId,
          workspacePath,
          workspaceSlug,
        });
        return;
      }
      const sessionPromise = waitForStandaloneSession({
        providerId: chat.providerId,
        providerSessionId: chat.providerSessionId,
        workspacePath,
      });
      api.createSession({
        initiativeSlug: null,
        providerId: chat.providerId,
        providerSessionId: chat.providerSessionId,
        runSlug: null,
        stage: null,
        workspacePath,
      });
      const session = await sessionPromise;
      openStandaloneSessionWindow({
        sessionId: session.id,
        workspacePath,
        workspaceSlug,
      });
      void loadChats();
    },
    [loadChats, workspacePath, workspaceSlug]
  );

  const startNewChat = useCallback(
    async (providerId: ProviderStackId) => {
      if (!(workspacePath && workspaceSlug)) {
        return;
      }
      setPickerOpen(false);
      const createdAfter = Date.now() - 2000;
      const targetModelId =
        providerId === "localModels"
          ? resolveDefaultStartCardModelSelection(
              api.getLastSettingsPayload(),
              providerId,
              availableEngines
            ).modelId
          : null;
      const placeholder = openStandaloneSessionPlaceholder({
        createdAfter,
        providerId,
        workspacePath,
        workspaceSlug,
      });
      const sessionPromise = waitForStandaloneSession({ providerId, workspacePath });
      api.createSession({
        initiativeSlug: null,
        providerId,
        runSlug: null,
        stage: null,
        targetModelId,
        workspacePath,
      });
      const session = await sessionPromise;
      openStandaloneSessionWindow({
        placeholder,
        sessionId: session.id,
        workspacePath,
        workspaceSlug,
      });
      void loadChats();
    },
    [availableEngines, loadChats, workspacePath, workspaceSlug]
  );

  const renameChat = useCallback(
    async (chat: ChatMenuChat, title: string) => {
      if (!workspacePath) {
        return;
      }
      if (!title || title === chat.title) {
        closeMenu();
        return;
      }
      await requestWorkspaceChatAction({
        method: "PATCH",
        providerId: chat.providerId,
        providerSessionId: chat.providerSessionId,
        title,
        workspacePath,
      });
      closeMenu();
      void loadChats();
    },
    [closeMenu, loadChats, workspacePath]
  );

  const deleteChat = useCallback(
    async (chat: ChatMenuChat) => {
      if (!workspacePath) {
        return;
      }
      const liveChat = chats.find(
        (item) =>
          item.providerId === chat.providerId &&
          item.providerSessionId === chat.providerSessionId
      );
      if (liveChat?.liveSessionId) {
        api.deleteSession(liveChat.liveSessionId);
      }
      await requestWorkspaceChatAction({
        method: "DELETE",
        providerId: chat.providerId,
        providerSessionId: chat.providerSessionId,
        workspacePath,
      });
      setChats((current) =>
        current.filter(
          (item) =>
            item.providerId !== chat.providerId ||
            item.providerSessionId !== chat.providerSessionId
        )
      );
      closeMenu();
      void loadChats();
    },
    [chats, closeMenu, loadChats, workspacePath]
  );

  return (
    <div className="pm-sidebar__chat">
      <button
        className="pm-chat-list__new"
        disabled={!workspacePath}
        onClick={() => setPickerOpen(true)}
        type="button"
      >
        {t(UI_LABELS_CATEGORY, "pm.chat.new_chat", "New Chat")}
      </button>
      <div className="pm-chat-list" role="list">
        {loading ? (
          <div className="pm-chat-list__empty">Loading chats...</div>
        ) : error ? (
          <div className="pm-chat-list__empty">{error}</div>
        ) : chats.length === 0 ? (
          <div className="pm-chat-list__empty">No chats yet.</div>
        ) : (
          chats.map((chat) => (
            <button
              className="pm-chat-list__item"
              key={`${chat.providerId}:${chat.providerSessionId}`}
              onClick={() => void openSession(chat)}
              onContextMenu={(event) => openChatMenu(event, chat)}
              onMouseDown={(event) => {
                if (event.button === 2) {
                  openChatMenu(event, chat);
                }
              }}
              type="button"
            >
              <span className="pm-chat-list__title">{chat.title}</span>
              <span className="pm-chat-list__meta">{chat.providerId}</span>
            </button>
          ))
        )}
      </div>
      {menu ? (
        <WorkspaceChatListMenu
          menu={menu}
          onChange={setMenu}
          onClose={closeMenu}
          onDelete={(chat) => void deleteChat(chat)}
          onRename={(chat, title) => void renameChat(chat, title)}
        />
      ) : null}
      <ProviderPicker
        onCancel={() => setPickerOpen(false)}
        onConfirm={(providerId) => void startNewChat(providerId)}
        providers={providers}
        visible={pickerOpen}
      />
    </div>
  );
};
