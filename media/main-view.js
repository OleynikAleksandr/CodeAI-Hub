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

    if (typeof ResizeObserver === "function") {
      const target =
        document.getElementById("app") ||
        document.body ||
        document.documentElement;
      if (target) {
        const observer = new ResizeObserver(() => postLayoutUpdate());
        observer.observe(target);
      }
    }

    window.addEventListener("resize", postLayoutUpdate);
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
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("message", handleMessage);
})();
