#include "platform/mac/codeai_hub_application_mac.h"

#include "cef_app.h"
#include "launcher_handler.h"
#include "wrapper/cef_helpers.h"

namespace {

void CreateApplicationMenu() {
  NSApplication* app = [NSApplication sharedApplication];
  if ([app mainMenu] != nil) {
    return;
  }

  NSMenu* menubar = [[NSMenu alloc] initWithTitle:@""];
  [app setMainMenu:menubar];

  NSMenuItem* appMenuItem =
      [[NSMenuItem alloc] initWithTitle:@"" action:nil keyEquivalent:@""];
  [menubar addItem:appMenuItem];

  NSMenu* appMenu = [[NSMenu alloc] initWithTitle:@""];
  NSString* appName = [[NSProcessInfo processInfo] processName];
  NSString* quitTitle = [NSString stringWithFormat:@"Quit %@", appName];
  NSMenuItem* quitItem =
      [[NSMenuItem alloc] initWithTitle:quitTitle
                                  action:@selector(terminate:)
                           keyEquivalent:@"q"];
  [quitItem setKeyEquivalentModifierMask:NSEventModifierFlagCommand];
  [appMenu addItem:quitItem];
  [appMenuItem setSubmenu:appMenu];

  NSMenuItem* editMenuItem =
      [[NSMenuItem alloc] initWithTitle:@"Edit" action:nil keyEquivalent:@""];
  [menubar addItem:editMenuItem];

  NSMenu* editMenu = [[NSMenu alloc] initWithTitle:@"Edit"];

  auto addEditCommand = ^(NSString* title, SEL action, NSString* key) {
    NSMenuItem* item =
        [[NSMenuItem alloc] initWithTitle:title
                                    action:action
                             keyEquivalent:key];
    [item setKeyEquivalentModifierMask:NSEventModifierFlagCommand];
    [item setTarget:nil];
    [editMenu addItem:item];
  };

  addEditCommand(@"Cut", @selector(cut:), @"x");
  addEditCommand(@"Copy", @selector(copy:), @"c");
  addEditCommand(@"Paste", @selector(paste:), @"v");
  addEditCommand(@"Select All", @selector(selectAll:), @"a");

  [editMenuItem setSubmenu:editMenu];
}

LauncherHandler* GetLauncherHandler() { return LauncherHandler::GetInstance(); }

}  // namespace

@implementation CodeAIHubApplication {
  BOOL handlingSendEvent_;
}

- (BOOL)isHandlingSendEvent {
  return handlingSendEvent_;
}

- (void)setHandlingSendEvent:(BOOL)handlingSendEvent {
  handlingSendEvent_ = handlingSendEvent;
}

- (void)sendEvent:(NSEvent*)event {
  CefScopedSendingEvent sendingEventScoper;
  [super sendEvent:event];
}

// Note: we intentionally do NOT override -[NSApplication terminate:]. Quit
// requests from Cmd+Q, Dock right-click Quit and menu Quit all flow through
// the standard AppKit path into -applicationShouldTerminate: below, which
// force-closes CEF browsers and cancels termination until OnBeforeClose
// drives CefQuitMessageLoop(). Overriding terminate: previously swallowed
// quits whenever a browser declined a non-force close (regression 1.2.46).

@end

@implementation CodeAIHubAppDelegate

- (void)createApplication:(id)object {
  static_cast<void>(object);
  CreateApplicationMenu();
  [NSApp setDelegate:self];
}

- (NSApplicationTerminateReply)applicationShouldTerminate:
    (NSApplication*)sender {
  static_cast<void>(sender);
  LauncherHandler* handler = GetLauncherHandler();
  if (handler == nullptr) {
    return NSTerminateNow;
  }

  if (!handler->IsClosing()) {
    // Force close so beforeunload/TryCloseBrowser cannot indefinitely block
    // the user-initiated quit. OnBeforeClose drives CefQuitMessageLoop()
    // once the last browser goes away, which lets main() return from
    // CefRunMessageLoop() and reach CefShutdown().
    handler->CloseAllBrowsers(true);
  }

  return NSTerminateCancel;
}

- (BOOL)applicationShouldHandleReopen:(NSApplication*)application
                    hasVisibleWindows:(BOOL)hasVisibleWindows {
  static_cast<void>(application);
  static_cast<void>(hasVisibleWindows);
  LauncherHandler* handler = GetLauncherHandler();
  if (handler != nullptr && !handler->IsClosing()) {
    handler->ShowMainWindow();
  }
  return NO;
}

- (BOOL)applicationSupportsSecureRestorableState:(NSApplication*)app {
  static_cast<void>(app);
  return YES;
}

@end
