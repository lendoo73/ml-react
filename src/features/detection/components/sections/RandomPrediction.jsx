import { X } from "lucide-react";
import { useDetectionClassPreview } from "../../hooks/useDetectionClassPreview.js";
import { useLanguage } from "../../../../context/useLanguage.js";
import { useEffect, useMemo, useState } from "react";
import { ModelClassLabels } from "../../../../components/ModelClassLabels.jsx";
import { ModelInfoSection } from "../../../../components/ModelInfoSection.jsx";

export const RandomPrediction = ({ model, classes, canFilterClasses = false }) => {
    const { t } = useLanguage();
    const [preview, setPreview] = useState(null);
    const [previewClass, setPreviewClass] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [classFilter, setClassFilter] = useState("");
    const fetchPreview = useDetectionClassPreview();
    const filteredClasses = useMemo(() => {
        const query = classFilter.trim().toLowerCase();
        return classes.filter((className) => className.toLowerCase().includes(query));
    }, [classFilter, classes]);

    useEffect(() => () => {
        if (preview?.url) URL.revokeObjectURL(preview.url);
    }, [preview]);

    const selectClass = async (className) => {
        setIsLoading(true);
        setError("");
        try {
            const { blob, sourceUrl } = await fetchPreview(model, className);
            setPreview((current) => {
                if (current?.url) URL.revokeObjectURL(current.url);
                return { url: URL.createObjectURL(blob), sourceUrl };
            });
            setPreviewClass(className);
        } catch (previewError) {
            setError(model.info?.previewError ?? previewError.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!model.info) return null;

    return (
        <>
        <ModelInfoSection info={model.info}>
            {classes.length ? (
                <>
                    {canFilterClasses ? (
                        <input
                            type="search"
                            value={classFilter}
                            onChange={(event) => setClassFilter(event.target.value)}
                            placeholder={t("ui.filterClassificationClasses")}
                            aria-label={t("ui.filterClassificationClasses")}
                            className="mt-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                        />
                    ) : null}
                    <ModelClassLabels
                        classes={filteredClasses}
                        onSelectClass={(className) => void selectClass(className)}
                        isLoading={isLoading}
                    />
                </>
            ) : null}
            {isLoading ? (
                <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    {t("ui.loadingClassPreview")}
                </p>
            ) : null}
            {error ? <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        </ModelInfoSection>
        {preview ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold">
                        {t("ui.classificationRandomPreview")}: {previewClass}
                    </h2>
                    <button
                        type="button"
                        onClick={() => {
                            setPreview(null);
                            setPreviewClass("");
                        }}
                        className="cursor-pointer rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                        aria-label={t("ui.closePreview")}
                    >
                        <X aria-hidden="true" className="h-5 w-5" />
                    </button>
                </div>
                <a
                    href={preview.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t("ui.openOriginalImage")}
                    className="block cursor-pointer"
                >
                    <img
                        src={preview.url}
                        alt={`${previewClass} ${t("ui.detectionPreviewAlt")}`}
                        className="max-h-[36rem] w-full rounded-xl bg-black object-contain"
                    />
                </a>
            </section>
        ) : null}
        </>
    );
};
