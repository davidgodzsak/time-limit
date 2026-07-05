import "@/lib/polyfill";
import { createRoot } from "react-dom/client";
import SettingsPage from "@/components/SettingsPage";
import { initI18n } from "@/lib/utils/i18n";
import "@/index.css"

const container = document.getElementById("root")!;
const root = createRoot(container);
initI18n().finally(() => root.render(<SettingsPage />));