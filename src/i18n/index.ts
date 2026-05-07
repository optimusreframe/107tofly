import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import es from "./es";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, es: { translation: es } },
    lng: "es",
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

if (typeof window !== "undefined") {
  // Apply persisted locale after hydration to avoid SSR/CSR mismatch.
  queueMicrotask(() => {
    try {
      const stored = window.localStorage.getItem("locale");
      if (stored && (stored === "es" || stored === "en") && i18n.language !== stored) {
        i18n.changeLanguage(stored);
      }
    } catch {
      /* ignore */
    }
  });
}

export default i18n;
