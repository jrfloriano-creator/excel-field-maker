import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDatabase } from "./lib/sqlite";
import { migrateFromLocalStorageIfNeeded } from "./lib/storage";

const rootEl = document.getElementById("root")!;

(async () => {
  try {
    await initDatabase();
    migrateFromLocalStorageIfNeeded();
  } catch (e) {
    console.error("Falha ao iniciar SQLite local:", e);
  }
  createRoot(rootEl).render(<App />);
})();
