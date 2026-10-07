import "@/lib/polyfill";
import { createRoot } from "react-dom/client";
import ReflectionPage from "@/components/ReflectionPage";
import { Toaster } from "@/components/ui/toaster";
import { initI18n } from "@/lib/utils/i18n";
import "@/index.css"

const container = document.getElementById("root")!;
const root = createRoot(container);
initI18n().finally(() => root.render(
  <>
    <ReflectionPage />
    {/* Without this every toast() in the app is a silent no-op. */}
    <Toaster />
  </>
));
