import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import {
  clearWorkflowStep,
  type WorkflowStepClearTarget,
} from "../../services/workflow-step-clear-client";
import { workflowStateStore } from "../../services/workflow-state-store";

interface ClearMenuState {
  readonly label: string;
  readonly mode: "confirm" | "menu";
  readonly target: WorkflowStepClearTarget;
  readonly x: number;
  readonly y: number;
}

const normalizeClearError = (error: unknown): string =>
  error instanceof Error ? error.message : "Workflow step clear failed.";

export const useWorkspaceTreeClearMenu = (params: {
  readonly workspacePath?: string;
  readonly workspaceSlug?: string | null;
}): {
  readonly bind: (
    target: WorkflowStepClearTarget | undefined,
    label: string
  ) => React.HTMLAttributes<HTMLElement>;
  readonly element: React.ReactNode;
} => {
  const [menu, setMenu] = useState<ClearMenuState | null>(null);
  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, menu]);

  const stopNativeMenu = (
    event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>
  ): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const openMenu = useCallback(
    (
      target: WorkflowStepClearTarget,
      label: string,
      x: number,
      y: number
    ): void => {
      setMenu({
        label,
        mode: "menu",
        target,
        x,
        y,
      });
    },
    []
  );

  const bind = useCallback(
    (
      target: WorkflowStepClearTarget | undefined,
      label: string
    ): React.HTMLAttributes<HTMLElement> =>
      target
        ? {
            onContextMenuCapture: stopNativeMenu,
            onContextMenu: (event) => {
              stopNativeMenu(event);
              openMenu(target, label, event.clientX, event.clientY);
            },
            onMouseDown: (event) => {
              if (event.button === 2) {
                stopNativeMenu(event);
                openMenu(target, label, event.clientX, event.clientY);
              }
            },
          }
        : {},
    [openMenu]
  );

  const requestConfirmation = useCallback(() => {
    if (!menu) {
      return;
    }
    setMenu({ ...menu, mode: "confirm" });
  }, [menu]);

  const clearConfirmed = useCallback(async () => {
    if (!(menu && params.workspacePath && params.workspaceSlug)) {
      close();
      return;
    }
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      close();
      return;
    }

    const activeMenu = menu;
    close();
    try {
      const result = await clearWorkflowStep({
        httpUrl,
        target: activeMenu.target,
        workspacePath: params.workspacePath,
        workspaceSlug: params.workspaceSlug,
      });
      window.dispatchEvent(
        new CustomEvent("pm:workflow-step:cleared", {
          detail: {
            target: result.target,
            deletedSessionIds: result.deletedSessionIds,
            restore: result.restore,
            workspacePath: params.workspacePath,
            workspaceSlug: result.workspaceSlug,
          },
        })
      );
      workflowStateStore.requestImmediatePoll();
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("pm:workflow-step:clear-failed", {
          detail: {
            error: normalizeClearError(error),
            target: activeMenu.target,
            workspacePath: params.workspacePath,
            workspaceSlug: params.workspaceSlug,
          },
        })
      );
    }
  }, [close, menu, params.workspacePath, params.workspaceSlug]);

  const menuContent =
    menu?.mode === "confirm" ? (
      <>
        <div className="pm-tree-menu__text">
          Clear "{menu.label}" and all downstream workflow data? This cannot be
          undone.
        </div>
        <div className="pm-tree-menu__warning">
          Core will use Git rollback, then run git clean -fd. Untracked files
          that are not ignored under this workspace will be removed.
        </div>
        <div className="pm-tree-menu__actions">
          <button
            className="pm-modal__button pm-modal__button--secondary"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="pm-modal__button pm-modal__button--danger"
            onClick={(event) => {
              event.stopPropagation();
              void clearConfirmed();
            }}
            type="button"
          >
            Clear
          </button>
        </div>
      </>
    ) : (
      <button
        className="pm-tree-menu__item"
        onClick={(event) => {
          event.stopPropagation();
          requestConfirmation();
        }}
        role="menuitem"
        type="button"
      >
        Clear
      </button>
    );

  return {
    bind,
    element: menu ? (
      <div
        aria-label="Workflow step menu"
        aria-modal={menu.mode === "confirm" ? "true" : undefined}
        className={
          menu.mode === "confirm" ? "pm-tree-menu__dialog" : "pm-tree-menu"
        }
        onClick={(event) => event.stopPropagation()}
        role={menu.mode === "confirm" ? "dialog" : "menu"}
        style={{ left: menu.x, top: menu.y }}
      >
        {menuContent}
      </div>
    ) : null,
  };
};
