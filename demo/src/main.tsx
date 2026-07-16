import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";
// shadcn/typeset — markdown styling system. The playground's "Markdown
// preset" form field lets each chat switch between the official shadcn
// presets (chat, docs, reading, compact, large) at runtime. Both files
// are optional; consumers who don't set config.ui.typeset still get the
// legacy `ai-prose` look.
import "@edd_remonts/ai-schadcn-chat/typeset.css";
import "@edd_remonts/ai-schadcn-chat/typeset-presets.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);