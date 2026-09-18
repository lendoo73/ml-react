import { common as enCommon } from "./en/common.js";
import { navigation as enNavigation } from "./en/navigation.js";
import { ui as enUi } from "./en/ui.js";
import { models as enModels } from "./en/models.js";
import { image as enImage } from "./en/image.js";
import { common as frCommon } from "./fr/common.js";
import { navigation as frNavigation } from "./fr/navigation.js";
import { ui as frUi } from "./fr/ui.js";
import { models as frModels } from "./fr/models.js";
import { image as frImage } from "./fr/image.js";

const createLocale = (common, navigation, ui, models, image) => ({
    ...common,
    navigation,
    ui,
    models,
    image,
});

export const translations = {
    en: createLocale(enCommon, enNavigation, enUi, enModels, enImage),
    fr: createLocale(frCommon, frNavigation, frUi, frModels, frImage),
};
