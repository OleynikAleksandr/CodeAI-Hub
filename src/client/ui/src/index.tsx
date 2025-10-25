import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppHost from "./app-host";
import { initializeCoreBridge } from "./core-bridge/core-bridge";
import { activateRoot } from "./root-dom";

initializeCoreBridge();

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
