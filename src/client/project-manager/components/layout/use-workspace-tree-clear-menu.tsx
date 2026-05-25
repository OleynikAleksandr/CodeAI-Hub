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
    const result = await clearWorkflowStep({
      httpUrl,
      target: menu.target,
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
    close();
  }, [close, menu, params.workspacePath, params.workspaceSlug]);

  const menuContent =
    menu?.mode === "confirm" ? (
      <div style={{ display: "grid", gap: 8, maxWidth: 280, padding: 8 }}>
        <div style={{ color: "#f8fafc", fontSize: 13, lineHeight: 1.4 }}>
          Clear "{menu.label}" and all downstream workflow data? This cannot be
          undone.
        </div>
        <div style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.4 }}>
          Core will use Git rollback, then run git clean -fd. Untracked files
          that are not ignored under this workspace will be removed.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 4,
              color: "#f8fafc",
              cursor: "pointer",
              font: "inherit",
              padding: "5px 10px",
            }}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              void clearConfirmed();
            }}
            style={{
              background: "#b91c1c",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              font: "inherit",
              padding: "5px 10px",
            }}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>
    ) : (
      <button
        onClick={(event) => {
          event.stopPropagation();
          requestConfirmation();
        }}
        role="menuitem"
        style={{
          background: "transparent",
          border: 0,
          color: "#f8fafc",
          cursor: "pointer",
          font: "inherit",
          padding: "6px 18px",
          textAlign: "left",
        }}
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
        onClick={(event) => event.stopPropagation()}
        role={menu.mode === "confirm" ? "dialog" : "menu"}
        style={{
          background: "#1f2937",
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 6,
          boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
          left: menu.x,
          padding: 4,
          position: "fixed",
          top: menu.y,
          zIndex: 1000,
        }}
      >
        {menuContent}
      </div>
    ) : null,
  };
};
