import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en";
import es from "./es";

const isBrowser = typeof window !== "undefined";

if (!i18n.isInitialized) {
  const chain = isBrowser ? i18n.use(LanguageDetector) : i18n;
  chain
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en }, es: { translation: es } },
      lng: isBrowser ? undefined : "es",
      fallbackLng: "es",
      supportedLngs: ["es", "en"],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      detection: isBrowser
        ? {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
            lookupLocalStorage: "locale",
          }
        : undefined,
    });
}

export default i18n;
