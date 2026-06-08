// Ambient typings for the View Transition API. The DOM lib doesn't ship
// these yet (as of TS 5.x). Used by ThemeToggle to wrap setTheme in a
// document.startViewTransition() call when the browser supports it.

interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

interface Document {
  startViewTransition?(callback: () => void | Promise<void>): ViewTransition;
}
