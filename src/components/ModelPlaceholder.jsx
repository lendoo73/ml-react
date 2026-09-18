import { useLanguage } from "../context/useLanguage.js";

export const ModelPlaceholder = ({ model }) => {
    const { t } = useLanguage();

    return (
        <div className="rounded-3xl border border-dashed border-blue-300 bg-white p-8 shadow-sm dark:border-blue-800 dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("ui.modelPlaceholderTitle")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                {model?.hero?.description ?? t("ui.modelPlaceholderDescription")}
            </p>
        </div>
    );
};
