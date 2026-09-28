import { X } from "lucide-react";
import { useLanguage } from "../../../../context/useLanguage.js";
import { ClassificationClassList } from "../ClassificationClassList.jsx";
import { ClassificationClassSelector } from "../ClassificationClassSelector.jsx";

export const RandomPrediction = ({
    model,
    title,
    description,
    classes,
    preview,
    onPreview,
    onSelectClass,
    isClassPreviewLoading = false,
    classPreviewError = "",
}) => {
    const { t } = useLanguage();

    return (
        <>
            {title || description ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div>
                        {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                            {description}
                        </p>
                    </div>
                    {model.classSourceUrl && model.endpoints?.search ? (
                        <ClassificationClassSelector
                            model={model}
                            onPreview={onPreview}
                        />
                    ) : null}
                </div>
            ) : null}
            <ClassificationClassList
                classes={classes}
                onSelectClass={onSelectClass}
                isLoading={isClassPreviewLoading}
            />
            {isClassPreviewLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
                    {t("ui.loadingClassPreview")}
                </p>
            ) : null}
            {classPreviewError ? (
                <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                    {classPreviewError}
                </p>
            ) : null}
            {preview ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold">
                            {t("ui.classificationRandomPreview")}: {preview.className}
                        </h2>
                        <button
                            type="button"
                            onClick={() => onPreview(null, "")}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                            aria-label={t("ui.closePreview")}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <img
                        src={preview.url}
                        alt={`${preview.className} ${t("ui.classificationPreviewAlt")}`}
                        className="max-h-[36rem] w-full rounded-xl bg-black object-contain"
                    />
                </div>
            ) : null}
        </>
    );
};
