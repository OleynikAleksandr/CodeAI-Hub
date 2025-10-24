#include "launcher_handler.h"

#include <windows.h>

#include "cef_browser.h"

void LauncherHandler::PlatformTitleChange(CefRefPtr<CefBrowser> browser,
                                          const CefString& title) {
  CefWindowHandle hwnd = browser->GetHost()->GetWindowHandle();
  if (hwnd) {
    SetWindowText(hwnd, title.ToWString().c_str());
  }
}

void LauncherHandler::PlatformShowWindow(CefRefPtr<CefBrowser> browser) {
  CefWindowHandle hwnd = browser->GetHost()->GetWindowHandle();
  if (hwnd) {
    ShowWindow(hwnd, SW_SHOWNORMAL);
    SetForegroundWindow(hwnd);
  }
}
