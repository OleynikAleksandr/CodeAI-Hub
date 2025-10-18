import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppHost, { activateRoot } from "./app-host";

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
