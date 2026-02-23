import "@/lib/polyfill";
import { createRoot } from "react-dom/client";
import InfoPage from "@/components/InfoPage";
import "@/index.css"

const container = document.getElementById("root")!;
createRoot(container).render(<InfoPage />);
