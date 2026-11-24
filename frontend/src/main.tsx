import React from "react";
import { createRoot } from "react-dom/client";
import Campaign from "./Headquarters";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Campaign />
  </React.StrictMode>,
);
