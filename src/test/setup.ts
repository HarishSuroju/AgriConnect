import "@testing-library/jest-dom";

// jsdom does not implement scrollIntoView; several components call it on
// mount/update (e.g. auto-scrolling chat UIs). Stub it so those components
// can be rendered in tests without crashing.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
