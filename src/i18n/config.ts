import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "./zh-CN.json";
import en from "./en.json";
import zhTW from "./zh-TW.json";

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
    "zh-TW": { translation: zhTW },
  },
  lng: "zh-CN",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
