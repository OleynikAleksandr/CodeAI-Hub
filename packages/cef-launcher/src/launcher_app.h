#ifndef CODEAI_HUB_LAUNCHER_APP_H_
#define CODEAI_HUB_LAUNCHER_APP_H_

#include "cef_app.h"

class LauncherApp : public CefApp, public CefBrowserProcessHandler {
 public:
  LauncherApp();

  CefRefPtr<CefBrowserProcessHandler> GetBrowserProcessHandler() override {
    return this;
  }

  void OnContextInitialized() override;
  CefRefPtr<CefClient> GetDefaultClient() override;

 private:
  IMPLEMENT_REFCOUNTING(LauncherApp);
  DISALLOW_COPY_AND_ASSIGN(LauncherApp);
};

#endif  // CODEAI_HUB_LAUNCHER_APP_H_
