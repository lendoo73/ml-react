import { translations } from "../content/translations/index.js";

/**
 * Return localized model copy keyed by stable model identifiers.
 *
 * @param {string} [language="en"] - Locale key to use, falling back to English when unavailable.
 * @returns {Record<string, object>} Localized model copy with its stable identifier attached.
 *
 * @example
 * const catalog = getModelCatalog("fr");
 * const model = catalog["instance-segmentation-yolo26"];
 * // model.hero.title is localized and model.id is "instance-segmentation-yolo26".
 */
export const getModelCatalog = (language = "en") => {
    const activeTranslations = translations[language] ?? translations.en;
    return Object.fromEntries(Object.entries(activeTranslations.models ?? {}).map(([id, model]) => (
        [id, { ...model, id }]
    )));
};

/**
 * Return the configured default model identifier for a locale.
 *
 * @param {string} [language="en"] - Locale key to use, falling back to English when unavailable.
 * @returns {string} Stable identifier of the default model.
 *
 * @example
 * getDefaultModelId("en"); // "yolo26-detect-official"
 */
export const getDefaultModelId = (language = "en") => {
    const activeTranslations = translations[language] ?? translations.en;
    return activeTranslations.app?.defaultModelId ?? "yolo26-detect-official";
};
