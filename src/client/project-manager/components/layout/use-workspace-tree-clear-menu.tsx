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

  const bind = useCallback(
    (
      target: WorkflowStepClearTarget | undefined,
      label: string
    ): React.HTMLAttributes<HTMLElement> =>
      target
        ? {
            onContextMenu: (event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenu({
                label,
                target,
                x: event.clientX,
                y: event.clientY,
              });
            },
          }
        : {},
    []
  );

  const clearSelected = useCallback(async () => {
    if (!(menu && params.workspacePath && params.workspaceSlug)) {
      close();
      return;
    }
    const confirmed = window.confirm(
      `Clear "${menu.label}" and all downstream workflow data? This removes generated artifacts and sessions. This cannot be undone.`
    );
    if (!confirmed) {
      close();
      return;
    }
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      close();
      return;
    }
    await clearWorkflowStep({
      httpUrl,
      target: menu.target,
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
    });
    workflowStateStore.requestImmediatePoll();
    close();
  }, [close, menu, params.workspacePath, params.workspaceSlug]);

  return {
    bind,
    element: menu ? (
      <div
        aria-label="Workflow step menu"
        role="menu"
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
        <button
          onClick={(event) => {
            event.stopPropagation();
            void clearSelected();
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
      </div>
    ) : null,
  };
};
