import "@/lib/polyfill";
import { createRoot } from "react-dom/client";
import SettingsPage from "@/components/SettingsPage";
import "@/index.css"

const container = document.getElementById("root")!;
createRoot(container).render(<SettingsPage />);