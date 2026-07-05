import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { seedMessages } from "@/lib/utils/i18n";
import enMessages from "./_locales/en/messages.json";
import deMessages from "./_locales/de/messages.json";
import esMessages from "./_locales/es/messages.json";
import frMessages from "./_locales/fr/messages.json";
import huMessages from "./_locales/hu/messages.json";
import plMessages from "./_locales/pl/messages.json";
import skMessages from "./_locales/sk/messages.json";
import ukMessages from "./_locales/uk/messages.json";

const LOCALES: Record<string, Record<string, unknown>> = {
  en: enMessages, de: deMessages, es: esMessages, fr: frMessages,
  hu: huMessages, pl: plMessages, sk: skMessages, uk: ukMessages,
};

const demoLang = localStorage.getItem('__demo_lang') ?? 'en';
seedMessages(LOCALES[demoLang] ?? enMessages, demoLang);

createRoot(document.getElementById("root")!).render(<App />);
