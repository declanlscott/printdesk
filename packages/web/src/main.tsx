import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "~/styles/globals.css";

import { App } from "~/app";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
