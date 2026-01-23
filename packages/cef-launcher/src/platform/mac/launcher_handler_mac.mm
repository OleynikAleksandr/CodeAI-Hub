#include "launcher_handler.h"

#import <Cocoa/Cocoa.h>

#include <string>

#import "window_state_persistence.h"
#import "window_state_tracker.h"

#include "cef_application_mac.h"
#include "cef_browser.h"

namespace {

NSWindow* GetWindowForBrowser(CefRefPtr<CefBrowser> browser) {
  NSView* view = CAST_CEF_WINDOW_HANDLE_TO_NSVIEW(
      browser->GetHost()->GetWindowHandle());
  return [view window];
}

}  // namespace

bool PickFolderFromFinder(std::string* out_path) {
  if (!out_path) {
    return false;
  }

  NSOpenPanel* panel = [NSOpenPanel openPanel];
  [panel setCanChooseFiles:NO];
  [panel setCanChooseDirectories:YES];
  [panel setAllowsMultipleSelection:NO];
  [panel setCanCreateDirectories:YES];
  [panel setPrompt:@"Select"];

  const NSInteger result = [panel runModal];
  if (result != NSModalResponseOK) {
    return false;
  }

  NSURL* url = [panel URL];
  if (!url) {
    return false;
  }

  const char* path = [[url path] fileSystemRepresentation];
  if (!path) {
    return false;
  }

  *out_path = std::string(path);
  return true;
}

void LauncherHandler::PlatformTitleChange(CefRefPtr<CefBrowser> browser,
                                          const CefString& title) {
  NSWindow* window = GetWindowForBrowser(browser);
  if (!window) {
    return;
  }

  std::string utf8_title = title.ToString();
  NSString* ns_title = [NSString stringWithUTF8String:utf8_title.c_str()];
  [window setTitle:ns_title];
}

void LauncherHandler::PlatformShowWindow(CefRefPtr<CefBrowser> browser) {
  NSWindow* window = GetWindowForBrowser(browser);
  if (!window) {
    return;
  }

  [WindowStatePersistence restoreWindow:window];
  [window makeKeyAndOrderFront:window];
  [WindowStateTracker startTrackingWindow:window];
}

void LauncherHandler::PlatformPersistWindowState(
    CefRefPtr<CefBrowser> browser) {
  NSWindow* window = GetWindowForBrowser(browser);
  if (!window) {
    return;
  }

  [WindowStateTracker stopTrackingWindow:window];
  [WindowStatePersistence persistWindow:window];
}
