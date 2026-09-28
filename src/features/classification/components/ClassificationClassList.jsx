import { useLanguage } from "../../../context/useLanguage.js";

export const ClassificationClassList = ({
    classes = [],
    onSelectClass,
    isLoading = false,
}) => {
    const { t } = useLanguage();

    if (classes.length === 0) return null;

    return (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("ui.classificationClasses")}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
                {classes.map((className) => (
                    <li key={className}>
                        {onSelectClass ? (
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => onSelectClass(className)}
                                className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60 dark:bg-blue-900/40 dark:text-blue-100 dark:hover:bg-blue-900/70"
                            >
                                {className}
                            </button>
                        ) : (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/40 dark:text-blue-100">
                                {className}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
};
