import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { api } from "../../api";
import { usePanelSizes } from "../../hooks/use-panel-sizes";
import { ensureWorkflowWorktree } from "../../services/workspace-session-client";
import type { WorkspaceProject } from "../../types";
import { MainArea } from "./main-area";
import { Sidebar } from "./sidebar";
import { useWorkspaceScopeSync } from "./workspace-scope-sync";

const UI_LABELS_CATEGORY = "ui_interface";
const UI_HELPER_TEXT_CATEGORY = "user_guidance";
const USER_MESSAGES_CATEGORY = "system_feedback";

const isAbsolutePath = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(trimmed) ||
    /^\\\\/.test(trimmed)
  );
};

type AddWorkspaceRequestedDetail = {
  readonly path: string;
};

/**
 * Main layout component (Grid container for Section 1 + Section 2)
 */
export const MainLayout: React.FC = () => {
  const { t } = useLocalization();
  const { sizes, updateSize } = usePanelSizes();
  const [projects, setProjects] = useState<readonly WorkspaceProject[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>();
  const [isAddWorkspaceModalOpen, setIsAddWorkspaceModalOpen] = useState(false);
  const [addWorkspacePath, setAddWorkspacePath] = useState("");
  const [addWorkspaceName, setAddWorkspaceName] = useState("");
  const [addWorkspaceError, setAddWorkspaceError] = useState<string | null>(null);
  const pendingAddWorkspacePathRef = useRef<string | null>(null);
  const initializedWorkspacesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = api.onProjectsUpdate((updatedProjects) => {
      setProjects(updatedProjects);
      let pendingWorkspaceId: string | undefined;
      const pendingPath = pendingAddWorkspacePathRef.current;
      if (pendingPath) {
        const candidate = updatedProjects.find(
          (workspace) => workspace.path === pendingPath
        );
        if (candidate) {
          pendingWorkspaceId = candidate.id;
          pendingAddWorkspacePathRef.current = null;
          ensureWorkflowWorktree({
            workspacePath: candidate.path,
            workspaceSlug: candidate.slug,
          }).catch(() => {
            /* best effort */
          });
        }
      }

      setSelectedWorkspaceId((current) => {
        if (pendingWorkspaceId) {
          return pendingWorkspaceId;
        }
        if (current && updatedProjects.some((project) => project.id === current)) {
          return current;
        }
        return updatedProjects[0]?.id;
      });
    });

    api.connect();

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AddWorkspaceRequestedDetail>).detail;
      if (!detail || typeof detail.path !== "string") {
        return;
      }
      pendingAddWorkspacePathRef.current = detail.path;
    };

    window.addEventListener("pm:workspace:add-requested", handler);
    return () => {
      window.removeEventListener("pm:workspace:add-requested", handler);
    };
  }, []);

  const handleAddWorkspace = () => {
    const opened = api.pickFolder();
    if (!opened) {
      setAddWorkspaceError(null);
      setAddWorkspaceName("");
      setAddWorkspacePath("");
      setIsAddWorkspaceModalOpen(true);
    }
  };

  const activeWorkspace = projects.find((p) => p.id === selectedWorkspaceId);
  useWorkspaceScopeSync(activeWorkspace);

  const addWorkspaceDialogLabel = t(
    UI_LABELS_CATEGORY,
    "pm.workspace_modal.dialog_label",
    "Add workspace"
  );
  const addWorkspaceTitle = t(
    UI_LABELS_CATEGORY,
    "pm.workspace_modal.title",
    "Add workspace"
  );
  const workspacePathLabel = t(
    UI_LABELS_CATEGORY,
    "pm.workspace_modal.path_label",
    "Workspace path"
  );
  const displayNameLabel = t(
    UI_LABELS_CATEGORY,
    "pm.workspace_modal.display_name_label",
    "Display name (optional)"
  );
  const addWorkspaceConfirmLabel = t(
    UI_LABELS_CATEGORY,
    "pm.workspace_modal.confirm_label",
    "Add"
  );
  const addWorkspaceCancelLabel = t(
    UI_LABELS_CATEGORY,
    "pm.workspace_modal.cancel_label",
    "Cancel"
  );
  const workspacePathPlaceholder = t(
    UI_HELPER_TEXT_CATEGORY,
    "pm.workspace_modal.path_placeholder",
    "/absolute/path/to/workspace"
  );
  const displayNamePlaceholder = t(
    UI_HELPER_TEXT_CATEGORY,
    "pm.workspace_modal.display_name_placeholder",
    "My Workspace"
  );
  const workspacePathRequiredError = t(
    USER_MESSAGES_CATEGORY,
    "pm.workspace_modal.error.path_required",
    "Path is required."
  );
  const workspacePathAbsoluteError = t(
    USER_MESSAGES_CATEGORY,
    "pm.workspace_modal.error.path_absolute",
    "Path must be absolute."
  );

  useEffect(() => {
    if (!activeWorkspace) {
      return;
    }
    if (initializedWorkspacesRef.current.has(activeWorkspace.id)) {
      return;
    }
    ensureWorkflowWorktree({
      workspacePath: activeWorkspace.path,
      workspaceSlug: activeWorkspace.slug,
    })
      .then(() => {
        initializedWorkspacesRef.current.add(activeWorkspace.id);
      })
      .catch(() => {
        /* best effort */
      });
  }, [activeWorkspace?.id]);

  return (
    <div className="pm-layout">
      {isAddWorkspaceModalOpen ? (
        <div
          aria-label={addWorkspaceDialogLabel}
          aria-modal="true"
          className="pm-workspace-overlay"
          onClick={() => setIsAddWorkspaceModalOpen(false)}
          role="dialog"
        >
          <div
            className="pm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="pm-modal__title" id="pm-add-workspace-title">
              {addWorkspaceTitle}
            </h2>
            <form
              aria-labelledby="pm-add-workspace-title"
              className="pm-modal__form"
              onSubmit={(event) => {
                event.preventDefault();
                const resolvedPath = addWorkspacePath.trim();
                const resolvedName = addWorkspaceName.trim();
                if (!resolvedPath) {
                  setAddWorkspaceError(workspacePathRequiredError);
                  return;
                }
                if (!isAbsolutePath(resolvedPath)) {
                  setAddWorkspaceError(workspacePathAbsoluteError);
                  return;
                }
                pendingAddWorkspacePathRef.current = resolvedPath;
                api.addProject(
                  resolvedPath,
                  resolvedName.length > 0 ? resolvedName : undefined
                );
                setIsAddWorkspaceModalOpen(false);
              }}
            >
              <label className="pm-modal__field">
                <span className="pm-modal__label">{workspacePathLabel}</span>
                <input
                  autoFocus
                  className="pm-modal__input"
                  onChange={(event) => {
                    setAddWorkspacePath(event.target.value);
                    setAddWorkspaceError(null);
                  }}
                  placeholder={workspacePathPlaceholder}
                  type="text"
                  value={addWorkspacePath}
                />
              </label>
              <label className="pm-modal__field">
                <span className="pm-modal__label">{displayNameLabel}</span>
                <input
                  className="pm-modal__input"
                  onChange={(event) => {
                    setAddWorkspaceName(event.target.value);
                    setAddWorkspaceError(null);
                  }}
                  placeholder={displayNamePlaceholder}
                  type="text"
                  value={addWorkspaceName}
                />
              </label>
              {addWorkspaceError ? (
                <div className="pm-modal__error" role="alert">
                  {addWorkspaceError}
                </div>
              ) : null}
              <div className="pm-modal__actions">
                <button className="pm-modal__button" type="submit">
                  {addWorkspaceConfirmLabel}
                </button>
                <button
                  className="pm-modal__button pm-modal__button--secondary"
                  onClick={() => setIsAddWorkspaceModalOpen(false)}
                  type="button"
                >
                  {addWorkspaceCancelLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <Sidebar
        onAddWorkspace={handleAddWorkspace}
        onSelectWorkspace={setSelectedWorkspaceId}
        selectedWorkspaceId={selectedWorkspaceId}
        workspaces={[...projects]}
      />
      <MainArea
        activeWorkspace={activeWorkspace}
        onSizeChange={updateSize}
        sizes={sizes}
      />
    </div>
  );
};
