import { createRoot } from "react-dom/client";
import { App } from "./app";

const mount = () => {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Failed to find root element");
  }

  window.__CODEAI_LOCALIZATION_BOOTSTRAP__ = null;

  const root = createRoot(container);
  root.render(<App />);
};

mount();
