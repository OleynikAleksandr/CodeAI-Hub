import type { LocalizationRuntimeBootstrapSnapshot } from "@codeai-hub/localization";
import { Uri, type Webview } from "vscode";

interface CoreBridgeConfig {
  readonly httpUrl: string;
  readonly workspacePath?: string;
  readonly wsUrl: string;
}

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
  generate(
    webview: Webview,
    _extensionUri: Uri,
    webviewUIRootPath: string,
    options: {
      readonly showChat?: boolean;
      readonly coreBridgeConfig?: CoreBridgeConfig;
      readonly localizationBootstrap?: LocalizationRuntimeBootstrapSnapshot | null;
    } = {}
  ): string {
    const {
      showChat = false,
      coreBridgeConfig,
      localizationBootstrap,
    } = options;
    const uiRootUri = Uri.file(webviewUIRootPath);
    const mainViewCssUri = webview.asWebviewUri(
      Uri.joinPath(uiRootUri, "main-view.css")
    );
    const reactAppJsUri = webview.asWebviewUri(
      Uri.joinPath(uiRootUri, "react-chat.js")
    );
    const reactAppCssUri = webview.asWebviewUri(
      Uri.joinPath(uiRootUri, "react-chat.css")
    );
    const sessionViewCssUri = webview.asWebviewUri(
      Uri.joinPath(uiRootUri, "session-view.css")
    );

    const nonce = this.getNonce();
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `connect-src ${webview.cspSource} https: http://127.0.0.1:* ws://127.0.0.1:*`,
      `script-src 'nonce-${nonce}'`,
    ].join("; ");

    const configScript = coreBridgeConfig
      ? `<script nonce="${nonce}">window.__CODEAI_CORE_CONFIG = ${this.serializeInlineValue(coreBridgeConfig)};</script>`
      : "";
    const localizationBootstrapScript =
      localizationBootstrap === undefined
        ? ""
        : `<script nonce="${nonce}">window.__CODEAI_LOCALIZATION_BOOTSTRAP__ = ${this.serializeInlineValue(localizationBootstrap)};</script>`;

    return `<!DOCTYPE html>
<html lang="en" style="background-color: rgb(24, 24, 24) !important;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <style>
    html {
      background-color: rgb(24, 24, 24) !important;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: rgb(24, 24, 24) !important;
      color: var(--vscode-editor-foreground, #cccccc);
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    body.loaded {
      opacity: 1;
    }
    #app {
      min-height: 100vh;
      background-color: rgb(24, 24, 24);
    }
    #root {
      min-height: 100vh;
      background-color: rgb(24, 24, 24);
    }
    /* Aggressive focus reset for Settings model cards */
    [role="radio"]:focus,
    [role="radio"]:focus-visible,
    [role="radio"]:focus-within {
      outline: none !important;
      box-shadow: none !important;
    }
    /* Also reset any potential VS Code webview focus injection */
    *:focus:not(input):not(textarea):not(button) {
      outline: none !important;
    }
  </style>
  <link href="${mainViewCssUri}" rel="stylesheet">
  <link href="${reactAppCssUri}" rel="stylesheet">
  <link href="${sessionViewCssUri}" rel="stylesheet">
  <title>CodeAI Hub</title>
</head>
<body>
  <div id="app"><div id="root"${showChat ? ' class="active"' : ""}></div></div>

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
  ${configScript}
  ${localizationBootstrapScript}
  <script nonce="${nonce}" src="${reactAppJsUri}"></script>
</body>
</html>`;
  }

  private serializeInlineValue(
    value: CoreBridgeConfig | LocalizationRuntimeBootstrapSnapshot | null
  ): string {
    return JSON.stringify(value ?? null).replace(/</g, "\\u003c");
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
