import { html, render } from "../vendor/htm-preact.mjs";
import { useState, useEffect } from "../vendor/preact-hooks.mjs";
import { getRoute, onRouteChange } from "./lib/state.js";
import { Home } from "./pages/Home.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Calendar } from "./pages/Calendar.js";
import { Badges } from "./pages/Badges.js";
import { MapPage } from "./pages/Map.js";
import { ToastContainer } from "./components/Toast.js";

function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    return onRouteChange(setRoute);
  }, []);

  let page;
  switch (route.page) {
    case "dashboard":
      page = html`<${Dashboard} childId=${route.childId} />`;
      break;
    case "calendar":
      page = html`<${Calendar} childId=${route.childId} />`;
      break;
    case "badges":
      page = html`<${Badges} childId=${route.childId} />`;
      break;
    case "map":
      page = html`<${MapPage} childId=${route.childId} />`;
      break;
    default:
      page = html`<${Home} />`;
  }

  return html`
    <${ToastContainer} />
    ${page}
  `;
}

render(html`<${App} />`, document.getElementById("app"));

// PWA 서비스 워커 등록
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
