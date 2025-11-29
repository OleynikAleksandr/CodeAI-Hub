import { initializeStandaloneEnvironment } from "./environment";

initializeStandaloneEnvironment();

(async () => {
  try {
    await import("../ui/src/index");
  } catch (error) {
    const container = document.getElementById("root");
    if (!container) {
      return;
    }
    container.innerHTML = "";
    const panel = document.createElement("div");
    panel.style.padding = "16px";
    panel.style.fontFamily = "var(--vscode-font-family, sans-serif)";
    panel.style.color = "#ff9b9b";
    panel.style.background = "#2a2125";
    panel.style.border = "1px solid #4a2727";
    panel.textContent = `Failed to start CodeAI Hub UI: ${(error as Error).message}`;
    container.appendChild(panel);
  }
})();
