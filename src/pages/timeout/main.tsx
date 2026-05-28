import "@/lib/polyfill";
import { createRoot } from "react-dom/client";
import TimeoutPage from "@/components/TimeoutPage";
import { initI18n } from "@/lib/utils/i18n";
import "@/index.css"

const container = document.getElementById("root")!;
const root = createRoot(container);
initI18n().finally(() => root.render(<TimeoutPage />));