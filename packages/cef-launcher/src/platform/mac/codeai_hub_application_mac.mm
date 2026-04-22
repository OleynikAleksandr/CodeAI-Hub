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

- (void)terminate:(id)sender {
  static_cast<void>(sender);
  CodeAIHubAppDelegate* delegate =
      (CodeAIHubAppDelegate*)[NSApp delegate];
  if (delegate != nil) {
    [delegate tryToTerminateApplication:self];
    return;
  }

  CefQuitMessageLoop();
}

@end

@implementation CodeAIHubAppDelegate

- (void)createApplication:(id)object {
  static_cast<void>(object);
  CreateApplicationMenu();
  [NSApp setDelegate:self];
}

- (void)tryToTerminateApplication:(NSApplication*)app {
  static_cast<void>(app);
  LauncherHandler* handler = GetLauncherHandler();
  if (handler != nullptr && !handler->IsClosing()) {
    handler->CloseAllBrowsers(false);
    return;
  }

  CefQuitMessageLoop();
}

- (NSApplicationTerminateReply)applicationShouldTerminate:
    (NSApplication*)sender {
  static_cast<void>(sender);
  return NSTerminateNow;
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
