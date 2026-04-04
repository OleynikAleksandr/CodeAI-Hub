import { createRoot } from "react-dom/client";
import { App } from "./app";
import { fetchProjectManagerLocalizationBootstrap } from "./services/localization-bootstrap";

const mount = async () => {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Failed to find root element");
  }

  window.__CODEAI_LOCALIZATION_BOOTSTRAP__ =
    await fetchProjectManagerLocalizationBootstrap();

  const root = createRoot(container);
  root.render(<App />);
};

mount().catch((error: unknown) => {
  throw error;
});
