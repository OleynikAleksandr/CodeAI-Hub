#import "window_state_tracker.h"

#import <objc/runtime.h>

#import "window_state_persistence.h"

static NSString* const kWindowStateAssociationKey =
    @"CodeAIHubWindowStateTracker";

@interface WindowStateTracker ()
@property(nonatomic, weak) NSWindow* window;
@end

@implementation WindowStateTracker

+ (void)startTrackingWindow:(NSWindow*)window {
  if (!window) {
    return;
  }

  WindowStateTracker* tracker = objc_getAssociatedObject(
      window, (__bridge const void*)(kWindowStateAssociationKey));
  if (!tracker) {
    tracker = [[WindowStateTracker alloc] initWithWindow:window];
    objc_setAssociatedObject(window,
                             (__bridge const void*)(kWindowStateAssociationKey),
                             tracker, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    [WindowStatePersistence persistWindow:window];
  }
}

+ (void)stopTrackingWindow:(NSWindow*)window {
  if (!window) {
    return;
  }

  WindowStateTracker* tracker = objc_getAssociatedObject(
      window, (__bridge const void*)(kWindowStateAssociationKey));
  if (tracker) {
    [[NSNotificationCenter defaultCenter] removeObserver:tracker];
    objc_setAssociatedObject(window,
                             (__bridge const void*)(kWindowStateAssociationKey),
                             nil, OBJC_ASSOCIATION_ASSIGN);
  }
}

- (instancetype)initWithWindow:(NSWindow*)window {
  self = [super init];
  if (self) {
    _window = window;
    NSNotificationCenter* center = [NSNotificationCenter defaultCenter];
    [center addObserver:self
               selector:@selector(handleWindowChanged:)
                   name:NSWindowDidMoveNotification
                 object:window];
    [center addObserver:self
               selector:@selector(handleWindowChanged:)
                   name:NSWindowDidResizeNotification
                 object:window];
    [center addObserver:self
               selector:@selector(handleWindowChanged:)
                   name:NSWindowDidEndLiveResizeNotification
                 object:window];
    [center addObserver:self
               selector:@selector(handleWindowClosed:)
                   name:NSWindowWillCloseNotification
                 object:window];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)handleWindowChanged:(NSNotification*)notification {
  if (!self.window) {
    return;
  }
  [WindowStatePersistence persistWindow:self.window];
}

- (void)handleWindowClosed:(NSNotification*)notification {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  objc_setAssociatedObject(self.window,
                           (__bridge const void*)(kWindowStateAssociationKey),
                           nil, OBJC_ASSOCIATION_ASSIGN);
  [WindowStatePersistence persistWindow:self.window];
}

@end
