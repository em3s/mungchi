// Simple reactive state using Preact signals pattern (manual)
let _route = { page: "home", childId: null };
let _listeners = [];

// Auth state (localStorage-based)
const AUTH_KEY = "mungchi_logged_in";

export function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function login() {
  localStorage.setItem(AUTH_KEY, "true");
}

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
