import { createRoot } from "react-dom/client";

import { App } from "~/app";

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
