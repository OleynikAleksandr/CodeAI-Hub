import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppHost from "./app-host";
import { readBrowserLocalizationBootstrapSnapshot } from "./app-host/localization-runtime-contract";
import { initializeCoreBridge } from "./core-bridge/core-bridge";
import { activateRoot } from "./root-dom";

initializeCoreBridge();
window.__CODEAI_LOCALIZATION_BOOTSTRAP__ =
  readBrowserLocalizationBootstrapSnapshot();

const mount = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  activateRoot();

  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <AppHost />
    </StrictMode>
  );
};

mount();
