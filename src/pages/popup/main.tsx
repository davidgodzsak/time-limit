import "@/lib/polyfill";
import { createRoot } from "react-dom/client";
import PluginPopup from "@/components/PluginPopup";
import "@/index.css"

const container = document.getElementById("root")!;
createRoot(container).render(<PluginPopup />);