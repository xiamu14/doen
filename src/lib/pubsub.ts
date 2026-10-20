export function createPubSub<T>() {
  const listeners = new Set<(message: T) => void>();

  return {
    subscribe(listener: (message: T) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(message: T) {
      listeners.forEach((listener) => listener(message));
    },
  };
}
