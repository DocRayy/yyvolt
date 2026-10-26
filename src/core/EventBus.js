/**
 * Tiny synchronous event bus.
 *
 * Modules never import each other directly; they publish and subscribe to
 * named events. Listeners are copied before dispatch, so a handler can safely
 * unsubscribe (or subscribe) while the event is being handled.
 */
export class EventBus {
  #listeners = new Map();

  /** Subscribe. Returns an unsubscribe function for clean teardown. */
  on(eventName, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Listener for "${eventName}" must be a function.`);
    }

    let listeners = this.#listeners.get(eventName);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(eventName, listeners);
    }
    listeners.add(handler);

    return () => this.off(eventName, handler);
  }

  once(eventName, handler) {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  off(eventName, handler) {
    const listeners = this.#listeners.get(eventName);
    if (!listeners) return;

    listeners.delete(handler);
    if (listeners.size === 0) this.#listeners.delete(eventName);
  }

  emit(eventName, payload) {
    const listeners = this.#listeners.get(eventName);
    if (!listeners) return;

    for (const handler of [...listeners]) {
      handler(payload);
    }
  }

  /** Drop one event's listeners, or every listener when called with no argument. */
  clear(eventName) {
    if (eventName === undefined) this.#listeners.clear();
    else this.#listeners.delete(eventName);
  }
}
