import { Construction } from "lucide-react";
import { useLanguage } from "../../context/useLanguage.js";

export const UnderConstruction = () => {
    const { t } = useLanguage();

    return (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-900/40">
            <Construction aria-hidden="true" className="size-10 text-amber-500" />
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                {t("ui.evaluationUnderConstructionTitle")}
            </p>
            <p className="max-w-xl text-sm text-gray-600 dark:text-gray-300">
                {t("ui.evaluationUnderConstructionDescription")}
            </p>
        </div>
    );
};

