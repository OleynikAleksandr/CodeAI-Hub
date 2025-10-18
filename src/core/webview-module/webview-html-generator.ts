import { Uri, type Webview } from "vscode";

const NONCE_LENGTH = 32;

/**
 * Generates the static HTML scaffold for the CodeAI Hub webview shell.
 * The shell renders two rows of buttons while the React application hydrates underneath.
 */
export class WebviewHtmlGenerator {
  /**
   * Compose HTML that mirrors the claude-code-fusion shell with two rows of buttons.
   *
   * @param webview - Active VS Code webview instance.
   * @param extensionUri - Extension root URI for asset resolution.
   * @param showChat - When true the React container is marked as active on load.
   */
  generate(webview: Webview, extensionUri: Uri, showChat = false): string {
    const mainViewCssUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, "media", "main-view.css")
    );
    const mainViewJsUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, "media", "main-view.js")
    );
    const reactAppJsUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, "media", "react-chat.js")
    );
    const reactAppCssUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, "media", "react-chat.css")
    );
    const sessionViewCssUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, "media", "session-view.css")
    );

    const nonce = this.getNonce();
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en" style="background-color: #1e1e1e !important;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <style>
    html { background-color: #1e1e1e !important; }
    body {
      background-color: #1e1e1e !important;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    body.loaded {
      opacity: 1;
    }
  </style>
  <link href="${mainViewCssUri}" rel="stylesheet">
  <link href="${reactAppCssUri}" rel="stylesheet">
  <link href="${sessionViewCssUri}" rel="stylesheet">
  <title>CodeAI Hub</title>
  <style>
    html, body {
      background-color: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #cccccc);
      margin: 0;
      padding: 0;
    }
    #app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background-color: var(--vscode-editor-background, #1e1e1e);
    }
    .main-view {
      flex-shrink: 0;
      background-color: #272727 !important;
    }
    .buttons-section {
      background-color: #272727 !important;
    }
    #homeView, .view-container, .all-buttons-container {
      background-color: #272727 !important;
    }
    #root {
      display: none;
      flex-grow: 1;
      overflow: hidden;
      background-color: var(--vscode-editor-background, #1e1e1e);
      padding: 12px;
      box-sizing: border-box;
    }
    #root.active {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  </style>
</head>
<body style="background-color: #1e1e1e !important;">
  <div id="app" style="background-color: #1e1e1e !important;">
    <div class="main-view">
      <div class="buttons-section" style="background-color: #272727 !important;">
        <div id="homeView" class="view-container" style="background-color: #272727 !important;">
          <div class="all-buttons-container" style="background-color: #272727 !important;">
            <div class="main-buttons">
              <button class="main-button" data-action="newSession">
                <span class="button-line1">New</span>
                <span class="button-line2">Session</span>
              </button>
              <button class="main-button" data-action="lastSession">
                <span class="button-line1">Last</span>
                <span class="button-line2">Session</span>
              </button>
              <button class="main-button" data-action="clearSession">
                <span class="button-line1">Clear</span>
                <span class="button-line2">Session</span>
              </button>
              <button class="main-button" data-action="oldSessions">
                <span class="button-line1">Old</span>
                <span class="button-line2">Sessions</span>
              </button>
            </div>
            <div class="custom-buttons">
              <button class="custom-button" data-action="custom1"></button>
              <button class="custom-button" data-action="custom2"></button>
              <button class="custom-button" data-action="custom3"></button>
              <button class="custom-button" data-action="custom4"></button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="root"${showChat ? ' class="active"' : ""}></div>
  </div>

  <script nonce="${nonce}">
    (function initFadeIn() {
      const setLoaded = () => {
        window.setTimeout(() => {
          document.body.classList.add('loaded');
        }, 50);
      };

      const checkLinks = () => {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        let everySheetReady = true;
        for (const link of links) {
          if (!link.sheet) {
            everySheetReady = false;
            break;
          }
        }
        if (everySheetReady) {
          setLoaded();
          return;
        }
        window.setTimeout(checkLinks, 10);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkLinks, { once: true });
        return;
      }
      checkLinks();
    })();
  </script>
  <script nonce="${nonce}" src="${mainViewJsUri}"></script>
  <script nonce="${nonce}" src="${reactAppJsUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const length = characters.length;
    let text = "";

    for (let index = 0; index < NONCE_LENGTH; index += 1) {
      const randomIndex = Math.floor(Math.random() * length);
      text += characters.charAt(randomIndex);
    }

    return text;
  }
}
