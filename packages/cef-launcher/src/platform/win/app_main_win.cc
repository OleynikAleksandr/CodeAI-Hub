#include <windows.h>

#include "cef_app.h"
#include "launcher_app.h"

int APIENTRY wWinMain(HINSTANCE hInstance,
                      HINSTANCE hPrevInstance,
                      LPTSTR lpCmdLine,
                      int nCmdShow) {
  CefEnableHighDPISupport();
  HINSTANCE module = GetModuleHandle(nullptr);
  CefMainArgs main_args(module);
  CefRefPtr<LauncherApp> app(new LauncherApp());

  int exit_code = CefExecuteProcess(main_args, app, nullptr);
  if (exit_code >= 0) {
    return exit_code;
  }

  CefSettings settings;
  settings.no_sandbox = true;

  CefInitialize(main_args, settings, app, nullptr);
  CefRunMessageLoop();
  CefShutdown();
  return 0;
}
