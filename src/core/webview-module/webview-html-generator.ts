import { Uri, type Webview } from "vscode";

const NONCE_LENGTH = 32;

/**
 * Generates the static HTML scaffold for the CodeAI Hub webview shell.
 * The shell renders the primary action buttons while the React application hydrates underneath.
 */
export class WebviewHtmlGenerator {
  /**
   * Compose HTML that mirrors the claude-code-fusion shell with the primary button row.
   *
   * @param webview - Active VS Code webview instance.
   * @param extensionUri - Extension root URI for asset resolution.
   * @param showChat - When true the React container is marked as active on load.
   */
  generate(webview: Webview, extensionUri: Uri, showChat = false): string {
    const mainViewCssUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, "media", "main-view.css")
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
      background-color: rgba(40, 41, 42, 1) !important;
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
      background-color: rgba(37, 37, 40, 1);
      color: var(--vscode-editor-foreground, #cccccc);
      margin: 0;
      padding: 0;
    }
    #app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: rgba(37, 37, 40, 1);
    }
    .action-bar {
      background-color: rgba(37, 37, 40, 1);
      padding: 8px;
      box-shadow: 0 1px rgba(255, 255, 255, 0.06);
    }
    .action-bar__inner {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .session-region {
      flex: 1 1 auto;
      padding: 8px;
      background-color: rgba(31, 31, 31, 1);
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    #root {
      display: none;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      background-color: rgba(37, 37, 40, 0);
      box-sizing: border-box;
    }
    #root.active {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
    }
  </style>
</head>
<body style="background-color: rgba(37, 37, 40, 1) !important;">
  <div id="app">
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
