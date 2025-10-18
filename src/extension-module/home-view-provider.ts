import {
  Uri,
  type WebviewView,
  type WebviewViewProvider,
  window,
} from "vscode";
import { WebviewHtmlGenerator } from "../core/webview-module/webview-html-generator";
import type { WebviewMessage } from "./home-view-message-router";
import { HomeViewMessageRouter } from "./home-view-message-router";

export class HomeViewProvider implements WebviewViewProvider {
  static readonly viewType = "codeaiHubView";

  private readonly extensionUri: Uri;
  private readonly htmlGenerator: WebviewHtmlGenerator;
  private readonly messageRouter: HomeViewMessageRouter;

  constructor(extensionUri: Uri) {
    this.extensionUri = extensionUri;
    this.htmlGenerator = new WebviewHtmlGenerator();
    this.messageRouter = new HomeViewMessageRouter();
  }

  resolveWebviewView(webviewView: WebviewView): void {
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [Uri.joinPath(this.extensionUri, "media")],
    };

    webview.html = this.htmlGenerator.generate(webview, this.extensionUri);

    webview.onDidReceiveMessage((message: WebviewMessage) => {
      this.messageRouter.handleMessage(message, webview);
    });
  }

  showSettingsPlaceholder(): void {
    window.showInformationMessage(
      "Settings panel will arrive in a later phase."
    );
  }
}
