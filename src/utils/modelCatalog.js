import { translations } from "../content/translations/index.js";

export const getModelCatalog = (language = "en") => {
    const activeTranslations = translations[language] ?? translations.en;
    return activeTranslations.models ?? {};
};

export const getDefaultModelId = (language = "en") => {
    const activeTranslations = translations[language] ?? translations.en;
    return activeTranslations.app?.defaultModelId ?? "yolo26-detect-official";
};
