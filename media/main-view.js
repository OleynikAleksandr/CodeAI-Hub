(() => {
  const getVsCodeApi = () => {
    if (window.vscode) {
      return window.vscode;
    }

    if (typeof window.acquireVsCodeApi === "function") {
      try {
        const api = window.acquireVsCodeApi();
        window.vscode = api;
        return api;
      } catch (_error) {
        return;
      }
    }

    return;
  };

  const vscode = getVsCodeApi();

  const postCommand = (command) => {
    if (!vscode) {
      return;
    }
    vscode.postMessage({ command });
  };

  const actionHandlers = {
    newSession: () => {
      const reactRoot = document.getElementById("root");
      if (reactRoot) {
        reactRoot.classList.add("active");
      }
      postCommand("newSession");
    },
    lastSession: () => postCommand("lastSession"),
    clearSession: () => postCommand("clearSession"),
    oldSessions: () => postCommand("oldSessions"),
    custom1: () => {
      /* Reserved for future quick action slot. */
    },
    custom2: () => {
      /* Reserved for future quick action slot. */
    },
    custom3: () => {
      /* Reserved for future quick action slot. */
    },
    custom4: () => {
      /* Reserved for future quick action slot. */
    },
  };

  const MAIN_BUTTON_MIN_WIDTH = 80;
  const MAIN_BUTTON_GAP = 4;
  const MAIN_BUTTON_LAYOUT_CLASSES = [
    "main-buttons--cols-4",
    "main-buttons--cols-2",
    "main-buttons--cols-1",
  ];
  const MAIN_BUTTON_COLUMNS_FULL = 4;
  const MAIN_BUTTON_COLUMNS_HALF = 2;
  const MAIN_BUTTON_COLUMNS_SINGLE = 1;
  const MAIN_BUTTON_COLUMN_CANDIDATES = [
    MAIN_BUTTON_COLUMNS_FULL,
    MAIN_BUTTON_COLUMNS_HALF,
    MAIN_BUTTON_COLUMNS_SINGLE,
  ];
  const MAIN_BUTTON_DEFAULT_COLUMNS = MAIN_BUTTON_COLUMNS_SINGLE;

  const mainButtonLayoutState = {
    columns: null,
  };

  const updateMainButtonLayout = () => {
    const container = document.querySelector(".main-buttons");
    if (!container) {
      return;
    }

    const width = container.clientWidth;
    if (width <= 0) {
      return;
    }

    let selected = MAIN_BUTTON_DEFAULT_COLUMNS;

    for (const candidate of MAIN_BUTTON_COLUMN_CANDIDATES) {
      const totalGap = MAIN_BUTTON_GAP * (candidate - 1);
      const usableWidth = width - totalGap;
      const columnWidth = usableWidth / candidate;

      if (columnWidth >= MAIN_BUTTON_MIN_WIDTH || candidate === 1) {
        selected = candidate;
        break;
      }
    }

    if (mainButtonLayoutState.columns === selected) {
      return;
    }

    mainButtonLayoutState.columns = selected;
    for (const className of MAIN_BUTTON_LAYOUT_CLASSES) {
      container.classList.remove(className);
    }
    container.classList.add(`main-buttons--cols-${selected}`);
  };

  const geometryState = {
    last: null,
  };

  const captureBounds = () => {
    const target =
      document.getElementById("app") ||
      document.body ||
      document.documentElement;
    if (!target) {
      return null;
    }

    const rect = target.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      absoluteX: (window.screenX || 0) + rect.left,
      absoluteY: (window.screenY || 0) + rect.top,
    };
  };

  const postLayoutUpdate = () => {
    if (!vscode) {
      return;
    }

    const bounds = captureBounds();
    if (!bounds) {
      return;
    }

    const previous = geometryState.last;
    const hasChanged =
      !previous ||
      Object.keys(bounds).some((key) => {
        const currentValue = bounds[key];
        const previousValue = previous ? previous[key] : 0;
        return Math.abs(currentValue - previousValue) > 1;
      });

    if (!hasChanged) {
      return;
    }

    geometryState.last = bounds;
    vscode.postMessage({ type: "ui:updateLayout", payload: bounds });
  };

  const handleResize = () => {
    postLayoutUpdate();
    updateMainButtonLayout();
  };

  const bindButtons = () => {
    const buttons = document.querySelectorAll("[data-action]");
    for (const button of buttons) {
      const action = button.getAttribute("data-action");
      if (!action) {
        continue;
      }
      const handler = actionHandlers[action];
      if (typeof handler === "function") {
        button.addEventListener("click", () => handler());
      }
    }
  };

  const initializeLayoutTracking = () => {
    postLayoutUpdate();
    updateMainButtonLayout();

    if (typeof ResizeObserver === "function") {
      const target =
        document.getElementById("app") ||
        document.body ||
        document.documentElement;
      if (target) {
        const observer = new ResizeObserver(() => handleResize());
        observer.observe(target);
      }
    }

    window.addEventListener("resize", handleResize);
  };

  const handleMessage = (event) => {
    const message = event.data;
    if (!message) {
      return;
    }

    const messageType = message.type || message.command;

    if (messageType === "ui:toggleChat") {
      const chatSection = document.querySelector(".chat-section");
      if (chatSection) {
        chatSection.style.display = message.showChat ? "flex" : "none";
      }
    }
  };

  const start = () => {
    bindButtons();
    initializeLayoutTracking();
    updateMainButtonLayout();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("message", handleMessage);
})();
