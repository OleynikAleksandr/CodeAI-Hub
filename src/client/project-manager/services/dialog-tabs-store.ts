export type DialogTabsState = {
  readonly openDialogIds: readonly string[];
  readonly activeDialogId: string | null;
  readonly treeBindings: Readonly<Record<string, string>>;
  readonly updatedAt: number;
};

const STORAGE_PREFIX = "codeai.pm.dialogTabs.v1:";

const defaultState = (): DialogTabsState => ({
  openDialogIds: [],
  activeDialogId: null,
  treeBindings: {},
  updatedAt: Date.now(),
});

const buildStorageKey = (workspaceSlug: string): string =>
  `${STORAGE_PREFIX}${workspaceSlug}`;

const readJson = (storageKey: string): unknown => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const coerceState = (value: unknown): DialogTabsState => {
  if (!isRecord(value)) {
    return defaultState();
  }

  const openDialogIds = Array.isArray(value.openDialogIds)
    ? value.openDialogIds.filter((item) => typeof item === "string")
    : [];

  const activeDialogId =
    value.activeDialogId === null || typeof value.activeDialogId === "string"
      ? (value.activeDialogId as string | null)
      : null;

  const treeBindings: Record<string, string> = {};
  if (isRecord(value.treeBindings)) {
    for (const [key, candidate] of Object.entries(value.treeBindings)) {
      if (typeof candidate === "string") {
        treeBindings[key] = candidate;
      }
    }
  }

  const updatedAt = typeof value.updatedAt === "number" ? value.updatedAt : Date.now();

  return {
    openDialogIds,
    activeDialogId,
    treeBindings,
    updatedAt,
  };
};

const writeState = (storageKey: string, state: DialogTabsState): void => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore persistence failures; PM will behave as stateless.
  }
};

export const loadDialogTabsState = (workspaceSlug: string): DialogTabsState => {
  if (!workspaceSlug) {
    return defaultState();
  }
  const storageKey = buildStorageKey(workspaceSlug);
  return coerceState(readJson(storageKey));
};

export const saveDialogTabsState = (
  workspaceSlug: string,
  state: DialogTabsState
): void => {
  if (!workspaceSlug) {
    return;
  }
  writeState(buildStorageKey(workspaceSlug), state);
};

export const upsertOpenDialog = (
  state: DialogTabsState,
  dialogId: string
): DialogTabsState => {
  if (!dialogId) {
    return state;
  }
  const openDialogIds = state.openDialogIds.includes(dialogId)
    ? state.openDialogIds
    : [...state.openDialogIds, dialogId];
  return {
    ...state,
    openDialogIds,
    activeDialogId: dialogId,
    updatedAt: Date.now(),
  };
};

export const closeOpenDialog = (
  state: DialogTabsState,
  dialogId: string
): DialogTabsState => {
  if (!dialogId) {
    return state;
  }
  const openDialogIds = state.openDialogIds.filter((id) => id !== dialogId);
  const activeDialogId =
    state.activeDialogId === dialogId ? openDialogIds.at(-1) ?? null : state.activeDialogId;
  return {
    ...state,
    openDialogIds,
    activeDialogId,
    updatedAt: Date.now(),
  };
};

export const setActiveDialogId = (
  state: DialogTabsState,
  dialogId: string | null
): DialogTabsState => ({
  ...state,
  activeDialogId: dialogId,
  updatedAt: Date.now(),
});

export const bindTreeNodeToDialog = (
  state: DialogTabsState,
  nodeKey: string,
  dialogId: string
): DialogTabsState => {
  if (!nodeKey || !dialogId) {
    return state;
  }
  if (state.treeBindings[nodeKey] === dialogId) {
    return state;
  }
  return {
    ...state,
    treeBindings: {
      ...state.treeBindings,
      [nodeKey]: dialogId,
    },
    updatedAt: Date.now(),
  };
};

