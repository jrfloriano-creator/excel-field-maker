import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { dbDriver } from "./lib/database";
import { migrateFromLocalStorageIfNeeded } from "./lib/storage";

const rootEl = document.getElementById("root")!;

(async () => {
  try {
    await dbDriver.init();
    await migrateFromLocalStorageIfNeeded();
  } catch (e) {
    console.error("Falha ao iniciar banco de dados:", e);
    alert("Erro ao inicializar o banco de dados: " + (e instanceof Error ? e.message : String(e)));
  }
  createRoot(rootEl).render(<App />);
})();
