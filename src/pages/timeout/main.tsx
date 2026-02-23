import "@/lib/polyfill";
import { createRoot } from "react-dom/client";
import TimeoutPage from "@/components/TimeoutPage";
import "@/index.css"

const container = document.getElementById("root")!;
createRoot(container).render(<TimeoutPage />);