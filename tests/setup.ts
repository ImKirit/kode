import '@testing-library/jest-dom'

// jsdom does not implement ResizeObserver — provide a no-op polyfill
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
