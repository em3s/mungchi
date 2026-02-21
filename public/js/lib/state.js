// Simple reactive state using Preact signals pattern (manual)
let _route = { page: "home", childId: null };
let _listeners = [];

export function getRoute() {
  return _route;
}

export function navigate(page, childId = null) {
  _route = { page, childId };
  _listeners.forEach((fn) => fn(_route));
}

export function onRouteChange(fn) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}
