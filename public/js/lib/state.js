// Simple reactive state
let _listeners = [];

// Session: logged-in childId (localStorage)
const SESSION_KEY = "mungchi_session";

export function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

export function login(childId) {
  localStorage.setItem(SESSION_KEY, childId);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// Route
let _route = getSession()
  ? { page: "dashboard", childId: getSession() }
  : { page: "home", childId: null };

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
